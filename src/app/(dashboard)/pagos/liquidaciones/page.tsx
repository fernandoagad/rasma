import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPayouts, getPayoutSummary } from "@/actions/payouts";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { FilterBar } from "@/components/ui/filter-bar";
import { Plus, Wallet, CheckCircle, Clock } from "lucide-react";
import { Suspense } from "react";

const payoutFilters = [
  {
    key: "status",
    label: "Estado",
    options: [
      { value: "all", label: "Todos" },
      { value: "pendiente", label: "Pendiente" },
      { value: "procesado", label: "Procesado" },
      { value: "pagado", label: "Pagado" },
    ],
  },
];

const payoutStatusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" }> = {
  pendiente: { label: "Pendiente", variant: "warning" },
  procesado: { label: "Procesado", variant: "info" },
  pagado: { label: "Pagado", variant: "success" },
};

export default async function LiquidacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [{ payouts, total, totalPages, currentPage }, summary] = await Promise.all([
    getPayouts({ status: params.status, page }),
    getPayoutSummary(),
  ]);

  const payoutTypeLabels: Record<string, string> = {
    mensual: "Mensual",
    por_pago: "Por sesión",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Liquidaciones"
        subtitle={`${total} registros`}
        action={
          session.user.role === "admin" ? (
            <Link href="/pagos/liquidaciones/nuevo">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nueva Liquidación
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendiente de Pago</p>
                <p className="text-2xl font-bold mt-1">
                  ${(summary.pendingAmount / 100).toLocaleString("es-CL")}
                </p>
                <p className="text-xs text-muted-foreground">{summary.pendingCount} liquidaciones</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pagado</p>
                <p className="text-2xl font-bold mt-1">
                  ${(summary.paidAmount / 100).toLocaleString("es-CL")}
                </p>
                <p className="text-xs text-muted-foreground">{summary.paidCount} liquidaciones</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rasma-green/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-rasma-green" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold mt-1">
                  ${((summary.pendingAmount + summary.paidAmount) / 100).toLocaleString("es-CL")}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rasma-teal/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-rasma-teal" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Suspense>
        <FilterBar filters={payoutFilters} basePath="/pagos/liquidaciones" />
      </Suspense>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Terapeuta</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Bruto</TableHead>
              <TableHead>Neto</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay liquidaciones registradas.
                </TableCell>
              </TableRow>
            ) : (
              payouts.map((p) => {
                const status = payoutStatusMap[p.status] || { label: p.status, variant: "default" as const };
                return (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4">
                      <Link href={`/pagos/liquidaciones/${p.id}`} className="flex items-center gap-3 hover:underline">
                        <AvatarInitials name={p.therapist.name} size="sm" />
                        <span className="font-medium text-sm">{p.therapist.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(p.periodStart + "T12:00:00").toLocaleDateString("es-CL")} — {new Date(p.periodEnd + "T12:00:00").toLocaleDateString("es-CL")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {payoutTypeLabels[p.payoutType] || p.payoutType}
                    </TableCell>
                    <TableCell className="text-sm">
                      ${(p.grossAmount / 100).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      ${(p.netAmount / 100).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge type="payout" status={p.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/pagos/liquidaciones?status=${params.status || "all"}&page=${p}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                p === currentPage ? "bg-rasma-dark text-rasma-lime" : "bg-muted hover:bg-muted/80"
              }`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
