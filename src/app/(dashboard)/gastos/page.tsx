import { getExpenses, getExpenseStats } from "@/actions/expenses";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, DollarSign, CalendarDays, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { Button } from "@/components/ui/button";
import { ExpenseActions } from "@/components/expenses/expense-actions";
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
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Descripción</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead className="hidden md:table-cell">Categoría</TableHead>
              <TableHead className="hidden md:table-cell">
                Comprobante
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay gastos registrados.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="pl-4">
                    <div>
                      <span className="font-medium text-sm">
                        {e.description}
                      </span>
                      {e.creator && (
                        <p className="text-xs text-muted-foreground">
                          por {e.creator.name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(e.date + "T12:00:00").toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    ${(e.amount / 100).toLocaleString("es-CL")}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <StatusBadge
                      type="expense_category"
                      status={e.category}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {e.receiptViewLink ? (
                      <a
                        href={e.receiptViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Ver
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ExpenseActions
                      expenseId={e.id}
                      receiptViewLink={e.receiptViewLink}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
