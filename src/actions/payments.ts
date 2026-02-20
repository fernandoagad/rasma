"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyPaymentReceived, notifyPaymentStatusChanged } from "@/lib/notifications";

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
});

export async function getPayments(params?: {
  status?: string;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

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
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado." };
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
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [payment] = await db.insert(payments).values({
    ...parsed.data,
    amount: Math.round(parsed.data.amount * 100), // Store in cents
    appointmentId: parsed.data.appointmentId || null,
    paymentMethod: parsed.data.paymentMethod || null,
    receiptNumber: parsed.data.receiptNumber || null,
    notes: parsed.data.notes || null,
    createdBy: session.user.id,
  }).returning({ id: payments.id });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "payment",
    entityId: payment.id,
    details: { amount: parsed.data.amount },
  });

  // Notify patient of payment (non-blocking)
  notifyPaymentReceived(parsed.data.patientId, {
    amount: `$${parsed.data.amount.toLocaleString("es-CL")}`,
    date: new Date(parsed.data.date + "T12:00:00").toLocaleDateString("es-CL"),
    method: parsed.data.paymentMethod || null,
    status: parsed.data.status || "pendiente",
    receiptNumber: parsed.data.receiptNumber || null,
  }).catch(() => {});

  revalidatePath("/pagos");
  return { success: true };
}

export async function updatePaymentStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado." };
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
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  const [pendingResult, paidResult] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(amount), 0)`, count: sql<number>`count(*)` })
      .from(payments).where(eq(payments.status, "pendiente")),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)`, count: sql<number>`count(*)` })
      .from(payments).where(eq(payments.status, "pagado")),
  ]);

  const [pending] = pendingResult;
  const [paid] = paidResult;

  return {
    pendingAmount: pending.total / 100,
    pendingCount: pending.count,
    paidAmount: paid.total / 100,
    paidCount: paid.count,
  };
}
