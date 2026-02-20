"use server";

import { requireRole } from "@/lib/authorization";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const COMMISSION_KEYS = {
  commission_internal_rate: 2000, // 20% default (basis points)
  commission_external_rate: 500,  // 5% default
  payout_deduction_monthly: 400,  // 4% default
  payout_deduction_per_payment: 700, // 7% default
} as const;

export type CommissionRates = {
  commissionInternalRate: number;
  commissionExternalRate: number;
  payoutDeductionMonthly: number;
  payoutDeductionPerPayment: number;
};

export async function getCommissionRates(): Promise<CommissionRates> {
  const rows = await db
    .select()
    .from(systemSettings)
    .where(
      eq(systemSettings.key, "commission_internal_rate")
    );

  // Fetch all 4 keys
  const allRows = await db.select().from(systemSettings);
  const map = new Map(allRows.map((r) => [r.key, r.value]));

  return {
    commissionInternalRate: Number(map.get("commission_internal_rate")) || COMMISSION_KEYS.commission_internal_rate,
    commissionExternalRate: Number(map.get("commission_external_rate")) || COMMISSION_KEYS.commission_external_rate,
    payoutDeductionMonthly: Number(map.get("payout_deduction_monthly")) || COMMISSION_KEYS.payout_deduction_monthly,
    payoutDeductionPerPayment: Number(map.get("payout_deduction_per_payment")) || COMMISSION_KEYS.payout_deduction_per_payment,
  };
}

export async function updateCommissionRates(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireRole(["admin"]);

  const rates = {
    commission_internal_rate: Math.round(Number(formData.get("commissionInternalRate")) * 100),
    commission_external_rate: Math.round(Number(formData.get("commissionExternalRate")) * 100),
    payout_deduction_monthly: Math.round(Number(formData.get("payoutDeductionMonthly")) * 100),
    payout_deduction_per_payment: Math.round(Number(formData.get("payoutDeductionPerPayment")) * 100),
  };

  // Validate ranges
  for (const [key, value] of Object.entries(rates)) {
    if (isNaN(value) || value < 0 || value > 10000) {
      return { error: `Valor inválido para ${key}. Debe ser entre 0% y 100%.` };
    }
  }

  const now = new Date();
  for (const [key, value] of Object.entries(rates)) {
    const existing = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key),
    });
    if (existing) {
      await db
        .update(systemSettings)
        .set({ value: String(value), updatedAt: now })
        .where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({
        key,
        value: String(value),
        updatedAt: now,
      });
    }
  }

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "commission_rates",
    entityId: "global",
    details: rates,
  });

  revalidatePath("/configuracion/comisiones");
  return { success: true };
}
