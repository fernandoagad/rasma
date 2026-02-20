"use server";

import { cache } from "react";
import { requireRole } from "@/lib/authorization";
import { db } from "@/lib/db";
import { expenses, income, payments, systemSettings, therapistPayouts } from "@/lib/db/schema";
import { eq, and, ne, sql, gte, lte } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const ADMIN_SUPERVISOR = ["admin", "supervisor"] as const;

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");

function computePeriodRange(
  periodType: string,
  year: number,
  value: number
): { dateFrom: string; dateTo: string; label: string } {
  switch (periodType) {
    case "quarter": {
      const startMonth = (value - 1) * 3 + 1;
      const endMonth = startMonth + 2;
      const lastDay = new Date(year, endMonth, 0).getDate();
      return {
        dateFrom: `${year}-${pad(startMonth)}-01`,
        dateTo: `${year}-${pad(endMonth)}-${pad(lastDay)}`,
        label: `${value}° Trimestre ${year}`,
      };
    }
    case "semester": {
      const startMonth = value === 1 ? 1 : 7;
      const endMonth = value === 1 ? 6 : 12;
      const lastDay = new Date(year, endMonth, 0).getDate();
      return {
        dateFrom: `${year}-${pad(startMonth)}-01`,
        dateTo: `${year}-${pad(endMonth)}-${pad(lastDay)}`,
        label: `${value === 1 ? "1er" : "2do"} Semestre ${year}`,
      };
    }
    case "year":
      return {
        dateFrom: `${year}-01-01`,
        dateTo: `${year}-12-31`,
        label: `Año ${year}`,
      };
    default: {
      const lastDay = new Date(year, value, 0).getDate();
      return {
        dateFrom: `${year}-${pad(value)}-01`,
        dateTo: `${year}-${pad(value)}-${pad(lastDay)}`,
        label: `${MONTH_NAMES[value - 1]} ${year}`,
      };
    }
  }
}

function getPreviousPeriodRange(
  periodType: string,
  year: number,
  value: number
): { dateFrom: string; dateTo: string } {
  switch (periodType) {
    case "quarter": {
      const prevValue = value === 1 ? 4 : value - 1;
      const prevYear = value === 1 ? year - 1 : year;
      return computePeriodRange("quarter", prevYear, prevValue);
    }
    case "semester": {
      const prevValue = value === 1 ? 2 : 1;
      const prevYear = value === 1 ? year - 1 : year;
      return computePeriodRange("semester", prevYear, prevValue);
    }
    case "year":
      return computePeriodRange("year", year - 1, value);
    default: {
      const prevMonth = value === 1 ? 12 : value - 1;
      const prevYear = value === 1 ? year - 1 : year;
      return computePeriodRange("month", prevYear, prevMonth);
    }
  }
}

const _getFinancialOverviewCached = cache(async (params: {
  periodType: string;
  year: number;
  periodValue: number;
}) => {
  const { periodType, year, periodValue } = params;
  const period = computePeriodRange(periodType, year, periodValue);
  const prevPeriod = getPreviousPeriodRange(periodType, year, periodValue);

  const dateRange = and(
    gte(expenses.date, period.dateFrom),
    lte(expenses.date, period.dateTo)
  );
  const prevDateRange = and(
    gte(expenses.date, prevPeriod.dateFrom),
    lte(expenses.date, prevPeriod.dateTo)
  );

  const [
    // Current period
    periodPayments,
    periodIncomeTotal,
    periodIncomeByCat,
    periodExpenseTotal,
    periodExpenseByCat,
    // Previous period
    prevPayments,
    prevIncomeTotal,
    prevExpenseTotal,
    // All-time for cash position
    allTimePayments,
    allTimeIncome,
    allTimeExpenses,
    // Initial balance
    initialBalanceSetting,
    // Monthly breakdown - payments
    monthlyPayments,
    // Monthly breakdown - income
    monthlyIncome,
    // Monthly breakdown - expenses
    monthlyExpenses,
    // Receipt compliance
    expenseReceiptStats,
    incomeReceiptStats,
    // Pending payments
    pendingPaymentsResult,
    // Payout summary
    outstandingPayoutsResult,
    paidPayoutsResult,
  ] = await Promise.all([
    // Current period: paid patient payments
    db.select({
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      count: sql<number>`count(*)`,
    }).from(payments).where(
      and(
        gte(payments.date, period.dateFrom),
        lte(payments.date, period.dateTo),
        eq(payments.status, "pagado")
      )
    ),
    // Current period: total income
    db.select({
      total: sql<number>`coalesce(sum(${income.amount}), 0)`,
      count: sql<number>`count(*)`,
    }).from(income).where(
      and(gte(income.date, period.dateFrom), lte(income.date, period.dateTo))
    ),
    // Current period: income by category
    db.select({
      category: income.category,
      total: sql<number>`coalesce(sum(${income.amount}), 0)`,
      count: sql<number>`count(*)`,
    }).from(income).where(
      and(gte(income.date, period.dateFrom), lte(income.date, period.dateTo))
    ).groupBy(income.category),
    // Current period: total expenses
    db.select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      count: sql<number>`count(*)`,
    }).from(expenses).where(dateRange),
    // Current period: expenses by category
    db.select({
      category: expenses.category,
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      count: sql<number>`count(*)`,
    }).from(expenses).where(dateRange).groupBy(expenses.category),
    // Previous period: payments
    db.select({
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    }).from(payments).where(
      and(
        gte(payments.date, prevPeriod.dateFrom),
        lte(payments.date, prevPeriod.dateTo),
        eq(payments.status, "pagado")
      )
    ),
    // Previous period: income
    db.select({
      total: sql<number>`coalesce(sum(${income.amount}), 0)`,
    }).from(income).where(
      and(gte(income.date, prevPeriod.dateFrom), lte(income.date, prevPeriod.dateTo))
    ),
    // Previous period: expenses
    db.select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
    }).from(expenses).where(prevDateRange),
    // All-time: payments
    db.select({
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    }).from(payments).where(eq(payments.status, "pagado")),
    // All-time: income
    db.select({
      total: sql<number>`coalesce(sum(${income.amount}), 0)`,
    }).from(income),
    // All-time: expenses
    db.select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
    }).from(expenses),
    // Initial balance setting
    db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, "finance_initial_balance"),
    }),
    // Monthly payments
    db.select({
      month: sql<string>`substr(${payments.date}, 1, 7)`,
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    }).from(payments).where(
      and(
        gte(payments.date, period.dateFrom),
        lte(payments.date, period.dateTo),
        eq(payments.status, "pagado")
      )
    ).groupBy(sql`substr(${payments.date}, 1, 7)`),
    // Monthly income
    db.select({
      month: sql<string>`substr(${income.date}, 1, 7)`,
      total: sql<number>`coalesce(sum(${income.amount}), 0)`,
    }).from(income).where(
      and(gte(income.date, period.dateFrom), lte(income.date, period.dateTo))
    ).groupBy(sql`substr(${income.date}, 1, 7)`),
    // Monthly expenses
    db.select({
      month: sql<string>`substr(${expenses.date}, 1, 7)`,
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
    }).from(expenses).where(dateRange).groupBy(sql`substr(${expenses.date}, 1, 7)`),
    // Receipt compliance - expenses
    db.select({
      total: sql<number>`count(*)`,
      withReceipt: sql<number>`sum(case when ${expenses.receiptDriveFileId} is not null then 1 else 0 end)`,
    }).from(expenses).where(dateRange),
    // Receipt compliance - income
    db.select({
      total: sql<number>`count(*)`,
      withReceipt: sql<number>`sum(case when ${income.receiptDriveFileId} is not null then 1 else 0 end)`,
    }).from(income).where(
      and(gte(income.date, period.dateFrom), lte(income.date, period.dateTo))
    ),
    // Pending payments amount
    db.select({
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      count: sql<number>`count(*)`,
    }).from(payments).where(eq(payments.status, "pendiente")),
    // Outstanding (unpaid) payouts
    db.select({
      total: sql<number>`coalesce(sum(${therapistPayouts.netAmount}), 0)`,
      count: sql<number>`count(*)`,
    }).from(therapistPayouts).where(ne(therapistPayouts.status, "pagado")),
    // Paid payouts
    db.select({
      total: sql<number>`coalesce(sum(${therapistPayouts.netAmount}), 0)`,
      count: sql<number>`count(*)`,
    }).from(therapistPayouts).where(eq(therapistPayouts.status, "pagado")),
  ]);

  // Compute metrics
  const initialBalance = initialBalanceSetting
    ? Number(initialBalanceSetting.value)
    : 0;

  const totalPatientPayments = periodPayments[0].total / 100;
  const totalIncomeAmount = periodIncomeTotal[0].total / 100;
  const totalPeriodIncome = totalPatientPayments + totalIncomeAmount;
  const totalPeriodExpenses = periodExpenseTotal[0].total / 100;
  const netBalance = totalPeriodIncome - totalPeriodExpenses;

  const cashPosition =
    (initialBalance + allTimePayments[0].total + allTimeIncome[0].total - allTimeExpenses[0].total) / 100;

  // Previous period totals
  const prevTotalIncome = (prevPayments[0].total + prevIncomeTotal[0].total) / 100;
  const prevTotalExpenses = prevExpenseTotal[0].total / 100;

  // Income breakdown
  const incomeByCatMap: Record<string, number> = {};
  for (const row of periodIncomeByCat) {
    incomeByCatMap[row.category] = row.total / 100;
  }

  // Expense breakdown
  const expenseBreakdown = periodExpenseByCat
    .map((row) => ({
      category: row.category,
      amount: row.total / 100,
      count: row.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Monthly trend
  const monthMap = new Map<string, { income: number; expenses: number }>();

  for (const row of monthlyPayments) {
    const existing = monthMap.get(row.month) || { income: 0, expenses: 0 };
    existing.income += row.total / 100;
    monthMap.set(row.month, existing);
  }
  for (const row of monthlyIncome) {
    const existing = monthMap.get(row.month) || { income: 0, expenses: 0 };
    existing.income += row.total / 100;
    monthMap.set(row.month, existing);
  }
  for (const row of monthlyExpenses) {
    const existing = monthMap.get(row.month) || { income: 0, expenses: 0 };
    existing.expenses += row.total / 100;
    monthMap.set(row.month, existing);
  }

  const monthlyTrend = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => {
      const [, m] = month.split("-");
      return {
        month,
        label: `${MONTH_NAMES[Number(m) - 1]}`,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      };
    });

  const expReceipt = expenseReceiptStats[0];
  const incReceipt = incomeReceiptStats[0];

  return {
    period: { dateFrom: period.dateFrom, dateTo: period.dateTo, label: period.label },
    totalIncome: totalPeriodIncome,
    totalExpenses: totalPeriodExpenses,
    netBalance,
    cashPosition,
    incomeBreakdown: {
      patientPayments: totalPatientPayments,
      donaciones: incomeByCatMap["donacion"] || 0,
      subvenciones: incomeByCatMap["subvencion"] || 0,
      patrocinios: incomeByCatMap["patrocinio"] || 0,
      eventos: incomeByCatMap["evento_benefico"] || 0,
      convenios: incomeByCatMap["convenio"] || 0,
      otrosIngresos: incomeByCatMap["otro_ingreso"] || 0,
    },
    expenseBreakdown,
    previousPeriod: {
      totalIncome: prevTotalIncome,
      totalExpenses: prevTotalExpenses,
      netBalance: prevTotalIncome - prevTotalExpenses,
    },
    monthlyTrend,
    expenseReceiptRate: expReceipt.total > 0
      ? ((expReceipt.withReceipt || 0) / expReceipt.total) * 100
      : 0,
    incomeReceiptRate: incReceipt.total > 0
      ? ((incReceipt.withReceipt || 0) / incReceipt.total) * 100
      : 0,
    incomeCount: periodPayments[0].count + periodIncomeTotal[0].count,
    expenseCount: periodExpenseTotal[0].count,
    pendingPayments: pendingPaymentsResult[0].total / 100,
    allTimeIncome: (allTimePayments[0].total + allTimeIncome[0].total) / 100,
    allTimeExpenses: allTimeExpenses[0].total / 100,
    initialBalance: initialBalance / 100,
    payoutSummary: {
      outstandingAmount: outstandingPayoutsResult[0].total / 100,
      outstandingCount: outstandingPayoutsResult[0].count,
      paidToTherapists: paidPayoutsResult[0].total / 100,
      paidCount: paidPayoutsResult[0].count,
    },
  };
});

export async function getFinancialOverview(params: {
  periodType: string;
  year: number;
  periodValue: number;
}) {
  await requireRole(ADMIN_SUPERVISOR);
  return _getFinancialOverviewCached(params);
}

export async function getInitialBalance(): Promise<number> {
  await requireRole(ADMIN_SUPERVISOR);
  const setting = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, "finance_initial_balance"),
  });
  return setting ? Number(setting.value) / 100 : 0;
}

export async function setInitialBalance(amount: number) {
  const session = await requireRole(ADMIN_SUPERVISOR);
  const valueInCents = String(Math.round(amount * 100));

  const existing = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, "finance_initial_balance"),
  });

  if (existing) {
    await db
      .update(systemSettings)
      .set({ value: valueInCents, updatedAt: new Date() })
      .where(eq(systemSettings.key, "finance_initial_balance"));
  } else {
    await db.insert(systemSettings).values({
      key: "finance_initial_balance",
      value: valueInCents,
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "system_settings",
    entityId: "finance_initial_balance",
    details: { amount, previousValue: existing?.value },
  });

  revalidatePath("/finanzas");
  return { success: true };
}
