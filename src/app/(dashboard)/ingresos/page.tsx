import { getIncome, getIncomeStats } from "@/actions/income";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, DollarSign, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { Button } from "@/components/ui/button";
import { IncomeTable } from "@/components/income/income-table";
import { Suspense } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { DateRangeFilter } from "./date-range-filter";

const incomeFilters = [
  {
    key: "category",
    label: "Categoría",
    options: [
      { value: "all", label: "Todas" },
      { value: "donacion", label: "Donación" },
      { value: "subvencion", label: "Subvención" },
      { value: "patrocinio", label: "Patrocinio" },
      { value: "evento_benefico", label: "Evento Benéfico" },
      { value: "convenio", label: "Convenio" },
      { value: "otro_ingreso", label: "Otro Ingreso" },
    ],
  },
];

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    search?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "supervisor"].includes(session.user.role)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [{ income, total, totalPages, currentPage }, stats] =
    await Promise.all([
      getIncome({
        category: params.category,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        page,
        search: params.search,
      }),
      getIncomeStats(),
    ]);

  const statCards = [
    {
      title: "Este Mes",
      value: `$${stats.totalThisMonth.toLocaleString("es-CL")}`,
      sub: `${stats.countThisMonth} ingresos`,
      icon: CalendarDays,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Total Acumulado",
      value: `$${stats.totalAllTime.toLocaleString("es-CL")}`,
      sub: `${stats.countAllTime} ingresos`,
      icon: DollarSign,
      color: "text-rasma-dark",
      bg: "bg-zinc-100",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Ingresos"
        subtitle={`${total} registros`}
        action={
          <Link href="/ingresos/nuevo">
            <Button className="h-11 px-5 text-base font-semibold rounded-xl gap-2 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
              <TrendingUp className="h-5 w-5" /> Nuevo Ingreso
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {statCards.map((stat) => (
          <Card key={stat.title} className="rounded-2xl">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-2xl font-extrabold text-rasma-dark mt-1 tabular-nums">{stat.value}</p>
                  {stat.sub && (
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
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

      <div className="flex items-center gap-4 flex-wrap">
        <Suspense>
          <SearchInput basePath="/ingresos" />
        </Suspense>
        <Suspense>
          <FilterBar filters={incomeFilters} basePath="/ingresos" />
        </Suspense>
        <Suspense>
          <DateRangeFilter />
        </Suspense>
      </div>

      <IncomeTable income={income} />

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 pt-4">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) pageNum = i + 1;
            else if (currentPage <= 4) pageNum = i + 1;
            else if (currentPage >= totalPages - 3) pageNum = totalPages - 6 + i;
            else pageNum = currentPage - 3 + i;
            const urlParams = new URLSearchParams();
            if (params.category) urlParams.set("category", params.category);
            if (params.dateFrom) urlParams.set("dateFrom", params.dateFrom);
            if (params.dateTo) urlParams.set("dateTo", params.dateTo);
            if (params.search) urlParams.set("search", params.search);
            urlParams.set("page", String(pageNum));
            return (
              <Link
                key={pageNum}
                href={`/ingresos?${urlParams.toString()}`}
                className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                  pageNum === currentPage ? "bg-rasma-dark text-rasma-lime" : "text-muted-foreground hover:bg-zinc-100"
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
