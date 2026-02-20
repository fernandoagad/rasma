"use server";

import { requireStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import { therapistPayouts, payoutItems, payments, appointments, patients, users } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getCommissionRates } from "@/actions/commissions";
import { notifyPayoutProcessed } from "@/lib/notifications";

const PAGE_SIZE = 20;

/**
 * Calculate a payout preview for a therapist in a given period.
 * Does NOT persist anything — just returns the breakdown.
 */
export async function calculateTherapistPayout(params: {
  therapistId: string;
  periodStart: string;
  periodEnd: string;
  payoutType: "mensual" | "por_pago";
}) {
  const session = await requireStaff();
  if (session.user.role !== "admin") throw new Error("No autorizado.");

  const rates = await getCommissionRates();

  // Find paid payments linked to this therapist in the period.
  // Join payments → appointments (therapistId) and payments → patients (type)
  const result = await db
    .select({
      paymentId: payments.id,
      paymentAmount: payments.amount,
      paymentDate: payments.date,
      patientType: patients.type,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      appointmentId: payments.appointmentId,
    })
    .from(payments)
    .innerJoin(patients, eq(payments.patientId, patients.id))
    .leftJoin(appointments, eq(payments.appointmentId, appointments.id))
    .where(
      and(
        eq(payments.status, "pagado"),
        gte(payments.date, params.periodStart),
        lte(payments.date, params.periodEnd),
        // Therapist match: via appointment or patient's primary therapist
        sql`(${appointments.therapistId} = ${params.therapistId} OR (${payments.appointmentId} IS NULL AND ${patients.primaryTherapistId} = ${params.therapistId}))`
      )
    )
    .orderBy(payments.date);

  // Calculate commissions for each payment
  const items = result.map((row) => {
    const type = row.patientType as "fundacion" | "externo";
    const commissionRate = type === "externo"
      ? rates.commissionExternalRate
      : rates.commissionInternalRate;

    const commissionAmount = Math.round((row.paymentAmount * commissionRate) / 10000);

    return {
      paymentId: row.paymentId,
      patientType: type,
      paymentAmount: row.paymentAmount,
      commissionRate,
      commissionAmount,
      patientName: row.patientName,
      paymentDate: row.paymentDate,
    };
  });

  const grossAmount = items.reduce((sum, i) => sum + i.paymentAmount, 0);
  const totalCommission = items.reduce((sum, i) => sum + i.commissionAmount, 0);

  // Payout deduction
  const deductionRate = params.payoutType === "mensual"
    ? rates.payoutDeductionMonthly
    : rates.payoutDeductionPerPayment;
  const afterCommission = grossAmount - totalCommission;
  const deductionAmount = Math.round((afterCommission * deductionRate) / 10000);
  const netAmount = afterCommission - deductionAmount;

  return {
    items,
    grossAmount,
    commissionAmount: totalCommission,
    deductionRate,
    deductionAmount,
    netAmount,
    payoutType: params.payoutType,
  };
}

/**
 * Create a payout record from a calculation.
 */
export async function createPayout(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireStaff();
  if (session.user.role !== "admin") return { error: "No autorizado." };

  const therapistId = formData.get("therapistId") as string;
  const periodStart = formData.get("periodStart") as string;
  const periodEnd = formData.get("periodEnd") as string;
  const payoutType = formData.get("payoutType") as "mensual" | "por_pago";
  const notes = (formData.get("notes") as string) || null;

  if (!therapistId || !periodStart || !periodEnd || !payoutType) {
    return { error: "Faltan datos requeridos." };
  }

  // Re-calculate to ensure data integrity
  const calc = await calculateTherapistPayout({
    therapistId,
    periodStart,
    periodEnd,
    payoutType,
  });

  if (calc.items.length === 0) {
    return { error: "No hay pagos en el período seleccionado para este terapeuta." };
  }

  const [payout] = await db.insert(therapistPayouts).values({
    therapistId,
    periodStart,
    periodEnd,
    payoutType,
    grossAmount: calc.grossAmount,
    commissionAmount: calc.commissionAmount,
    deductionAmount: calc.deductionAmount,
    netAmount: calc.netAmount,
    notes,
    createdBy: session.user.id,
  }).returning({ id: therapistPayouts.id });

  // Insert payout items
  for (const item of calc.items) {
    await db.insert(payoutItems).values({
      payoutId: payout.id,
      paymentId: item.paymentId,
      patientType: item.patientType,
      paymentAmount: item.paymentAmount,
      commissionRate: item.commissionRate,
      commissionAmount: item.commissionAmount,
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "payout",
    entityId: payout.id,
    details: {
      therapistId,
      periodStart,
      periodEnd,
      payoutType,
      grossAmount: calc.grossAmount,
      netAmount: calc.netAmount,
    },
  });

  revalidatePath("/pagos/liquidaciones");
  return { success: true, payoutId: payout.id };
}

/**
 * Mark a payout as paid (admin enters bank transfer reference).
 */
export async function markPayoutPaid(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireStaff();
  if (session.user.role !== "admin") return { error: "No autorizado." };

  const payoutId = formData.get("payoutId") as string;
  const bankTransferRef = (formData.get("bankTransferRef") as string) || null;

  if (!payoutId) return { error: "ID de liquidación requerido." };

  await db.update(therapistPayouts).set({
    status: "pagado",
    bankTransferRef,
    paidAt: new Date(),
  }).where(eq(therapistPayouts.id, payoutId));

  await logAudit({
    userId: session.user.id,
    action: "update_status",
    entityType: "payout",
    entityId: payoutId,
    details: { status: "pagado", bankTransferRef },
  });

  // Notify therapist (non-blocking)
  const payout = await db.query.therapistPayouts.findFirst({
    where: eq(therapistPayouts.id, payoutId),
  });
  if (payout) {
    notifyPayoutProcessed(payout.therapistId, {
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      grossAmount: payout.grossAmount,
      commissionAmount: payout.commissionAmount,
      deductionAmount: payout.deductionAmount,
      netAmount: payout.netAmount,
      bankTransferRef,
    }).catch(() => {});
  }

  revalidatePath("/pagos/liquidaciones");
  return { success: true };
}

/**
 * List payouts with pagination and filters.
 */
export async function getPayouts(params?: {
  status?: string;
  therapistId?: string;
  page?: number;
}) {
  const session = await requireStaff();
  if (!["admin", "rrhh"].includes(session.user.role)) throw new Error("No autorizado.");

  const page = params?.page || 1;
  const offset = (page - 1) * PAGE_SIZE;
  const conditions = [];

  if (params?.status && params.status !== "all") {
    conditions.push(eq(therapistPayouts.status, params.status as "pendiente" | "procesado" | "pagado"));
  }

  if (params?.therapistId) {
    conditions.push(eq(therapistPayouts.therapistId, params.therapistId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(therapistPayouts).where(where),
    db.query.therapistPayouts.findMany({
      where,
      with: {
        therapist: { columns: { id: true, name: true } },
      },
      orderBy: [desc(therapistPayouts.createdAt)],
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  return {
    payouts: data,
    total: countResult[0].count,
    totalPages: Math.ceil(countResult[0].count / PAGE_SIZE),
    currentPage: page,
  };
}

/**
 * Get a single payout with all its items.
 */
export async function getPayoutById(id: string) {
  const session = await requireStaff();
  if (!["admin", "rrhh"].includes(session.user.role)) throw new Error("No autorizado.");

  const payout = await db.query.therapistPayouts.findFirst({
    where: eq(therapistPayouts.id, id),
    with: {
      therapist: { columns: { id: true, name: true, email: true } },
      items: {
        with: {
          payment: {
            with: {
              patient: { columns: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  if (!payout) throw new Error("Liquidación no encontrada.");

  // Also get the therapist's bank account
  const bankAccount = await db.query.therapistBankAccounts.findFirst({
    where: (ba, { eq: e }) => e(ba.userId, payout.therapistId),
  });

  return { ...payout, bankAccount };
}

/**
 * Get payout summary: per-therapist outstanding balances.
 */
export async function getPayoutSummary() {
  const session = await requireStaff();
  if (!["admin", "rrhh"].includes(session.user.role)) throw new Error("No autorizado.");

  const pending = await db
    .select({
      total: sql<number>`coalesce(sum(${therapistPayouts.netAmount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(therapistPayouts)
    .where(eq(therapistPayouts.status, "pendiente"));

  const paid = await db
    .select({
      total: sql<number>`coalesce(sum(${therapistPayouts.netAmount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(therapistPayouts)
    .where(eq(therapistPayouts.status, "pagado"));

  return {
    pendingAmount: pending[0].total,
    pendingCount: pending[0].count,
    paidAmount: paid[0].total,
    paidCount: paid[0].count,
  };
}

/**
 * Get therapists list for payout selection.
 */
export async function getTherapists() {
  await requireStaff();

  return db.query.users.findMany({
    where: and(
      eq(users.role, "terapeuta"),
      eq(users.active, true),
    ),
    columns: { id: true, name: true, email: true },
    orderBy: [users.name],
  });
}
