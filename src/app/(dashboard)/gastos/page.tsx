import { getExpenses, getExpenseStats } from "@/actions/expenses";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, DollarSign, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { Button } from "@/components/ui/button";
import { ExpenseTable } from "@/components/expenses/expense-table";
import { Suspense } from "react";
import { DateRangeFilter } from "./date-range-filter";

const expenseFilters = [
  {
    key: "category",
    label: "Categoría",
    options: [
      { value: "all", label: "Todas" },
      { value: "arriendo", label: "Arriendo" },
      { value: "servicios_basicos", label: "Servicios Básicos" },
      { value: "suministros", label: "Suministros" },
      { value: "mantenimiento", label: "Mantenimiento" },
      { value: "seguros", label: "Seguros" },
      { value: "marketing", label: "Marketing" },
      { value: "software", label: "Software" },
      { value: "personal", label: "Personal" },
      { value: "otros", label: "Otros" },
    ],
  },
];

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "supervisor"].includes(session.user.role)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [{ expenses, total, totalPages, currentPage }, stats] =
    await Promise.all([
      getExpenses({
        category: params.category,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        page,
      }),
      getExpenseStats(),
    ]);

  const statCards = [
    {
      title: "Este Mes",
      value: `$${stats.totalThisMonth.toLocaleString("es-CL")}`,
      sub: `${stats.countThisMonth} gastos`,
      icon: CalendarDays,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "Total Acumulado",
      value: `$${stats.totalAllTime.toLocaleString("es-CL")}`,
      sub: `${stats.countAllTime} gastos`,
      icon: DollarSign,
      color: "text-rasma-teal",
      bg: "bg-rasma-teal/10",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Gastos"
        subtitle={`${total} registros`}
        action={
          <Link href="/gastos/nuevo">
            <Button>
              <Wallet className="mr-2 h-4 w-4" /> Nuevo Gasto
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  {stat.sub && (
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  )}
                </div>
                <div
                  className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Suspense>
          <FilterBar filters={expenseFilters} basePath="/gastos" />
        </Suspense>
        <Suspense>
          <DateRangeFilter />
        </Suspense>
      </div>

      {/* Table */}
      <ExpenseTable expenses={expenses} />

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const urlParams = new URLSearchParams();
            if (params.category) urlParams.set("category", params.category);
            if (params.dateFrom) urlParams.set("dateFrom", params.dateFrom);
            if (params.dateTo) urlParams.set("dateTo", params.dateTo);
            urlParams.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/gastos?${urlParams.toString()}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  p === currentPage
                    ? "bg-rasma-dark text-rasma-lime"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
