import { getFinancialOverview } from "@/actions/finance";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Landmark, TrendingUp, TrendingDown,
  Wallet, ArrowUpRight, ArrowDownRight,
  CreditCard, Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { UI } from "@/constants/ui";
import { Suspense } from "react";
import { MonthlyTrendChart, IncomeDonutChart, ExpenseDonutChart } from "@/components/finance/charts/charts-wrapper";
import { PeriodSelector } from "./period-selector";
import { InitialBalanceEditor } from "./initial-balance-editor";

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

function delta(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const pct = delta(current, previous);
  if (pct === null) return <span className="text-xs text-muted-foreground">sin datos previos</span>;
  const isUp = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}% vs anterior
    </span>
  );
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; year?: string; value?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "supervisor"].includes(session.user.role)) redirect("/");

  const params = await searchParams;
  const periodType = params.period || "month";
  const year = Number(params.year) || new Date().getFullYear();
  const periodValue = Number(params.value) || (
    periodType === "month" ? new Date().getMonth() + 1 :
    periodType === "quarter" ? Math.ceil((new Date().getMonth() + 1) / 3) :
    periodType === "semester" ? (new Date().getMonth() < 6 ? 1 : 2) : 1
  );

  const data = await getFinancialOverview({ periodType, year, periodValue });

  const statCards = [
    {
      title: "Ingresos Totales",
      value: fmt(data.totalIncome),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      delta: <DeltaBadge current={data.totalIncome} previous={data.previousPeriod.totalIncome} />,
    },
    {
      title: "Gastos Totales",
      value: fmt(data.totalExpenses),
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50",
      delta: <DeltaBadge current={data.totalExpenses} previous={data.previousPeriod.totalExpenses} />,
    },
    {
      title: "Balance Neto",
      value: fmt(data.netBalance),
      icon: data.netBalance >= 0 ? TrendingUp : TrendingDown,
      color: data.netBalance >= 0 ? "text-green-600" : "text-red-600",
      bg: data.netBalance >= 0 ? "bg-green-50" : "bg-red-50",
      delta: <DeltaBadge current={data.netBalance} previous={data.previousPeriod.netBalance} />,
    },
    {
      title: "Posición de Caja",
      value: fmt(data.cashPosition),
      icon: Landmark,
      color: data.cashPosition >= 0 ? "text-rasma-teal" : "text-red-600",
      bg: data.cashPosition >= 0 ? "bg-rasma-teal/10" : "bg-red-50",
      delta: <span className="text-xs text-muted-foreground">balance acumulado</span>,
    },
  ];

  const incomeItems = [
    { label: "Pagos de Pacientes", amount: data.incomeBreakdown.patientPayments, color: "bg-blue-500" },
    { label: "Donaciones", amount: data.incomeBreakdown.donaciones, color: "bg-green-500" },
    { label: "Subvenciones", amount: data.incomeBreakdown.subvenciones, color: "bg-indigo-500" },
    { label: "Patrocinios", amount: data.incomeBreakdown.patrocinios, color: "bg-teal-500" },
    { label: "Eventos Benéficos", amount: data.incomeBreakdown.eventos, color: "bg-lime-500" },
    { label: "Convenios", amount: data.incomeBreakdown.convenios, color: "bg-amber-500" },
    { label: "Otros Ingresos", amount: data.incomeBreakdown.otrosIngresos, color: "bg-gray-400" },
  ];

  const expenseCategoryColors: Record<string, string> = {
    arriendo: "bg-blue-500",
    servicios_basicos: "bg-cyan-500",
    suministros: "bg-teal-500",
    mantenimiento: "bg-amber-500",
    seguros: "bg-lime-500",
    marketing: "bg-purple-500",
    software: "bg-gray-500",
    personal: "bg-rose-500",
    otros: "bg-gray-400",
  };

  const expenseItems = data.expenseBreakdown.map((e) => ({
    label: UI.expenses.categories[e.category] || e.category,
    amount: e.amount,
    color: expenseCategoryColors[e.category] || "bg-gray-400",
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Finanzas"
        subtitle={data.period.label}
        action={
          <div className="flex items-center gap-2">
            <Link href="/ingresos/nuevo">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" /> Nuevo Ingreso
              </Button>
            </Link>
            <Link href="/gastos/nuevo">
              <Button variant="outline" size="sm">
                <Wallet className="h-4 w-4 mr-2" /> Nuevo Gasto
              </Button>
            </Link>
          </div>
        }
      />

      {/* Period Selector */}
      <Suspense>
        <PeriodSelector />
      </Suspense>

      {/* 4 Key Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold mt-1">{stat.value}</p>
                  <div className="mt-1">{stat.delta}</div>
                </div>
                <div className={`h-9 w-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Income + Expense Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Desglose de Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeDonutChart items={incomeItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Desglose de Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseDonutChart items={expenseItems} />
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart (only for multi-month periods) */}
      {data.monthlyTrend.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tendencia Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={data.monthlyTrend} />
            <div className="mt-4 flex items-center justify-between text-sm font-semibold border-t pt-3">
              <span>Total</span>
              <div className="flex gap-6">
                <span className="text-green-700">{fmt(data.totalIncome)}</span>
                <span className="text-red-600">{fmt(data.totalExpenses)}</span>
                <span className={data.netBalance >= 0 ? "text-green-700" : "text-red-600"}>
                  {data.netBalance >= 0 ? "+" : ""}{fmt(data.netBalance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Cards: Cash Position + Compliance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-rasma-teal" />
              Posición de Caja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo inicial</span>
                <span className="font-medium">{fmt(data.initialBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">+ Ingresos históricos</span>
                <span className="font-medium text-green-700">{fmt(data.allTimeIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">- Gastos históricos</span>
                <span className="font-medium text-red-600">{fmt(data.allTimeExpenses)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>= Caja actual</span>
                <span className={data.cashPosition >= 0 ? "text-green-700" : "text-red-600"}>
                  {fmt(data.cashPosition)}
                </span>
              </div>
            </div>
            {data.pendingPayments > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
                <CreditCard className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-amber-800">
                  {fmt(data.pendingPayments)} en pagos pendientes
                </span>
              </div>
            )}
            <InitialBalanceEditor currentBalance={data.initialBalance} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Cumplimiento de Comprobantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Gastos con comprobante</span>
                  <span className="font-medium">{data.expenseReceiptRate.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${data.expenseReceiptRate >= 80 ? "bg-green-500" : data.expenseReceiptRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${data.expenseReceiptRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Ingresos con comprobante</span>
                  <span className="font-medium">{data.incomeReceiptRate.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${data.incomeReceiptRate >= 80 ? "bg-green-500" : data.incomeReceiptRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${data.incomeReceiptRate}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Período: {data.period.label} · {data.expenseCount} gastos · {data.incomeCount} ingresos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Therapist Payouts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-rasma-teal" />
            Liquidaciones a Terapeutas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Pendiente de pago</p>
              <p className="text-xl font-bold mt-1">{fmt(data.payoutSummary.outstandingAmount)}</p>
              <p className="text-xs text-muted-foreground">{data.payoutSummary.outstandingCount} liquidaciones</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pagado a terapeutas</p>
              <p className="text-xl font-bold mt-1 text-green-700">{fmt(data.payoutSummary.paidToTherapists)}</p>
              <p className="text-xs text-muted-foreground">{data.payoutSummary.paidCount} liquidaciones</p>
            </div>
          </div>
          <Link href="/pagos/liquidaciones">
            <Button variant="outline" size="sm" className="mt-2">
              <Wallet className="h-4 w-4 mr-2" /> Ver Liquidaciones
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/pagos"><Button variant="outline" size="sm">Ver Pagos</Button></Link>
        <Link href="/gastos"><Button variant="outline" size="sm">Ver Gastos</Button></Link>
        <Link href="/ingresos"><Button variant="outline" size="sm">Ver Ingresos</Button></Link>
      </div>
    </div>
  );
}
