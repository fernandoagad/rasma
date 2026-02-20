import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMpPayment } from "@/lib/mercadopago";
import { notifyPaymentStatusChanged } from "@/lib/notifications";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";

function verifySignature(req: NextRequest, body: string): boolean {
  if (!WEBHOOK_SECRET) return true; // Skip verification in dev

  const xSignature = req.headers.get("x-signature") || "";
  const xRequestId = req.headers.get("x-request-id") || "";

  // MercadoPago sends: ts=...,v1=...
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Extract data.id from the query string
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") || "";

  // Build the manifest string per MP docs
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET).update(manifest).digest("hex");

  return hmac === v1;
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  if (!verifySignature(req, body)) {
    console.error("MercadoPago webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { type?: string; data?: { id?: string }; action?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // We only care about payment notifications
  if (payload.type !== "payment" || !payload.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const mpPaymentId = payload.data.id;

  try {
    // Fetch the payment details from MercadoPago
    const mpPayment = await getMpPayment(mpPaymentId);
    const externalRef = mpPayment.external_reference;
    if (!externalRef) {
      console.warn("MercadoPago webhook: no external_reference on payment", mpPaymentId);
      return NextResponse.json({ ok: true });
    }

    // Map MP status to our status
    const statusMap: Record<string, "pendiente" | "pagado" | "cancelado"> = {
      approved: "pagado",
      authorized: "pagado",
      in_process: "pendiente",
      in_mediation: "pendiente",
      rejected: "cancelado",
      cancelled: "cancelado",
      refunded: "cancelado",
      charged_back: "cancelado",
    };

    const newStatus = statusMap[mpPayment.status || ""] || "pendiente";

    // Update our payment record
    await db.update(payments).set({
      mercadoPagoPaymentId: mpPaymentId,
      mercadoPagoStatus: mpPayment.status || null,
      status: newStatus,
      ...(newStatus === "pagado" ? { paymentMethod: "mercadopago" } : {}),
    }).where(eq(payments.id, externalRef));

    // Send notification (non-blocking)
    notifyPaymentStatusChanged(externalRef, newStatus).catch(() => {});

    console.log(`MercadoPago webhook: payment ${externalRef} updated to ${newStatus} (MP: ${mpPayment.status})`);
  } catch (err) {
    console.error("MercadoPago webhook processing error:", err);
    // Return 200 anyway to avoid MP retries for processing errors
  }

  return NextResponse.json({ ok: true });
}
