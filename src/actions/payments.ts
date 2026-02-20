"use server";

import { requireStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyPaymentReceived, notifyPaymentStatusChanged } from "@/lib/notifications";
import { createCheckoutPreference } from "@/lib/mercadopago";

const PAGE_SIZE = 20;

const paymentSchema = z.object({
  patientId: z.string().min(1, "Seleccione un paciente"),
  appointmentId: z.string().optional(),
  amount: z.coerce.number().min(1, "El monto debe ser mayor a 0"),
  status: z.enum(["pendiente", "pagado", "parcial", "cancelado"]).default("pendiente"),
  paymentMethod: z.enum(["efectivo", "transferencia", "tarjeta", "otro"]).optional(),
  date: z.string().min(1, "Seleccione una fecha"),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
  fundingSource: z.enum(["paciente", "fundacion"]).default("paciente"),
});

export async function getPayments(params?: {
  status?: string;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
  fundingSource?: string;
  page?: number;
}) {
  const session = await requireStaff();

  if (session.user.role === "terapeuta") throw new Error("No autorizado.");

  const page = params?.page || 1;
  const offset = (page - 1) * PAGE_SIZE;
  const conditions = [];

  if (params?.status && params.status !== "all") {
    conditions.push(eq(payments.status, params.status as "pendiente" | "pagado" | "parcial" | "cancelado"));
  }

  if (params?.patientId) {
    conditions.push(eq(payments.patientId, params.patientId));
  }

  if (params?.dateFrom) {
    conditions.push(gte(payments.date, params.dateFrom));
  }

  if (params?.dateTo) {
    conditions.push(lte(payments.date, params.dateTo));
  }

  if (params?.fundingSource && params.fundingSource !== "all") {
    conditions.push(eq(payments.fundingSource, params.fundingSource as "paciente" | "fundacion"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(payments).where(where),
    db.query.payments.findMany({
      where,
      with: {
        patient: { columns: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [desc(payments.date)],
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  return {
    payments: data,
    total: countResult[0].count,
    totalPages: Math.ceil(countResult[0].count / PAGE_SIZE),
    currentPage: page,
  };
}

export async function createPayment(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireStaff();
  if (session.user.role === "terapeuta") return { error: "No autorizado." };

  const parsed = paymentSchema.safeParse({
    patientId: formData.get("patientId"),
    appointmentId: formData.get("appointmentId") || undefined,
    amount: formData.get("amount"),
    status: formData.get("status") || "pendiente",
    paymentMethod: formData.get("paymentMethod") || undefined,
    date: formData.get("date"),
    receiptNumber: formData.get("receiptNumber") || undefined,
    notes: formData.get("notes") || undefined,
    fundingSource: formData.get("fundingSource") || "paciente",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Foundation-funded payments are auto-set as paid via transferencia
  const isFoundation = parsed.data.fundingSource === "fundacion";
  const finalStatus = isFoundation ? "pagado" : (parsed.data.status || "pendiente");
  const finalMethod = isFoundation ? "transferencia" : (parsed.data.paymentMethod || null);

  const [payment] = await db.insert(payments).values({
    ...parsed.data,
    amount: Math.round(parsed.data.amount * 100), // Store in cents
    status: finalStatus,
    appointmentId: parsed.data.appointmentId || null,
    paymentMethod: finalMethod,
    receiptNumber: parsed.data.receiptNumber || null,
    notes: parsed.data.notes || null,
    fundingSource: parsed.data.fundingSource,
    createdBy: session.user.id,
  }).returning({ id: payments.id });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "payment",
    entityId: payment.id,
    details: { amount: parsed.data.amount, fundingSource: parsed.data.fundingSource },
  });

  // Notify patient of payment (non-blocking)
  notifyPaymentReceived(parsed.data.patientId, {
    amount: `$${parsed.data.amount.toLocaleString("es-CL")}`,
    date: new Date(parsed.data.date + "T12:00:00").toLocaleDateString("es-CL"),
    method: finalMethod,
    status: finalStatus,
    receiptNumber: parsed.data.receiptNumber || null,
  }).catch(() => {});

  revalidatePath("/pagos");
  return { success: true };
}

export async function createMercadoPagoPayment(
  _prev: { error?: string; success?: boolean; checkoutUrl?: string } | undefined,
  formData: FormData
) {
  const session = await requireStaff();
  if (session.user.role === "terapeuta") return { error: "No autorizado." };

  const patientId = formData.get("patientId") as string;
  const amount = Number(formData.get("amount"));
  const date = formData.get("date") as string;
  const appointmentId = (formData.get("appointmentId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!patientId) return { error: "Seleccione un paciente." };
  if (!amount || amount < 1) return { error: "El monto debe ser mayor a 0." };
  if (!date) return { error: "Seleccione una fecha." };

  // Look up patient name for the checkout description
  const patient = await db.query.patients.findFirst({
    where: (p, { eq: e }) => e(p.id, patientId),
    columns: { firstName: true, lastName: true },
  });

  const [payment] = await db.insert(payments).values({
    patientId,
    appointmentId,
    amount: Math.round(amount * 100),
    status: "pendiente",
    paymentMethod: "mercadopago",
    date,
    notes,
    createdBy: session.user.id,
  }).returning({ id: payments.id });

  try {
    const mpResult = await createCheckoutPreference({
      paymentId: payment.id,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Paciente",
      amount,
      description: `Pago consulta - ${patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}`,
    });

    await db.update(payments).set({
      mercadoPagoPreferenceId: mpResult.preferenceId,
      checkoutUrl: mpResult.initPoint,
    }).where(eq(payments.id, payment.id));

    await logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "payment",
      entityId: payment.id,
      details: { amount, method: "mercadopago", mpPreferenceId: mpResult.preferenceId },
    });

    revalidatePath("/pagos");
    return { success: true, checkoutUrl: mpResult.initPoint };
  } catch (err) {
    console.error("MercadoPago preference creation failed:", err);
    // Payment was created but MP failed — keep it as pending manual payment
    await logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "payment",
      entityId: payment.id,
      details: { amount, method: "mercadopago", error: "MP preference failed" },
    });
    revalidatePath("/pagos");
    return { error: "Error al crear enlace de MercadoPago. El pago fue registrado como pendiente." };
  }
}

export async function updatePaymentStatus(id: string, status: string) {
  const session = await requireStaff();
  if (session.user.role === "terapeuta") return { error: "No autorizado." };

  await db.update(payments).set({
    status: status as "pendiente" | "pagado" | "parcial" | "cancelado",
  }).where(eq(payments.id, id));

  await logAudit({
    userId: session.user.id,
    action: "update_status",
    entityType: "payment",
    entityId: id,
    details: { status },
  });

  // Notify patient of status change (non-blocking)
  notifyPaymentStatusChanged(id, status).catch(() => {});

  revalidatePath("/pagos");
  return { success: true };
}

export async function getPaymentStats() {
  await requireStaff();

  const [pendingResult, paidResult, foundationResult] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(amount), 0)`, count: sql<number>`count(*)` })
      .from(payments).where(eq(payments.status, "pendiente")),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)`, count: sql<number>`count(*)` })
      .from(payments).where(eq(payments.status, "pagado")),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)`, count: sql<number>`count(*)` })
      .from(payments).where(and(eq(payments.fundingSource, "fundacion"), eq(payments.status, "pagado"))),
  ]);

  const [pending] = pendingResult;
  const [paid] = paidResult;
  const [foundation] = foundationResult;

  return {
    pendingAmount: pending.total / 100,
    pendingCount: pending.count,
    paidAmount: paid.total / 100,
    paidCount: paid.count,
    foundationPaidAmount: foundation.total / 100,
    foundationPaidCount: foundation.count,
  };
}
