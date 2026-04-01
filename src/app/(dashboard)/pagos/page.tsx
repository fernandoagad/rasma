import { getPayments, getPaymentStats } from "@/actions/payments";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, DollarSign, Clock, CheckCircle, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { PaymentActions } from "@/components/payments/payment-actions";
import { CopyCheckoutUrl } from "@/components/payments/copy-checkout-url";
import { Suspense } from "react";

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  mercadopago: "MercadoPago",
  otro: "Otro",
};

const paymentFilters = [
  {
    key: "status",
    label: "Estado",
    options: [
      { value: "all", label: "Todos" },
      { value: "pendiente", label: "Pendiente" },
      { value: "pagado", label: "Pagado" },
      { value: "parcial", label: "Parcial" },
      { value: "cancelado", label: "Cancelado" },
    ],
  },
  {
    key: "fundingSource",
    label: "Fuente",
    options: [
      { value: "all", label: "Todos" },
      { value: "paciente", label: "Paciente" },
      { value: "fundacion", label: "Fundacion" },
    ],
  },
];

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; fundingSource?: string; page?: string; mp_status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "terapeuta") redirect("/");

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [{ payments, total, totalPages, currentPage }, stats] = await Promise.all([
    getPayments({ status: params.status, fundingSource: params.fundingSource, page }),
    getPaymentStats(),
  ]);

  const statCards = [
    { title: "Cobrado", value: `$${stats.paidAmount.toLocaleString("es-CL")}`, sub: `${stats.paidCount} pagos`, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
    { title: "Pendiente", value: `$${stats.pendingAmount.toLocaleString("es-CL")}`, sub: `${stats.pendingCount} pagos`, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
    { title: "Fundacion", value: `$${stats.foundationPaidAmount.toLocaleString("es-CL")}`, sub: `${stats.foundationPaidCount} pagos`, icon: CreditCard, color: "text-rasma-dark", bg: "bg-zinc-100" },
    { title: "Total", value: `$${(stats.paidAmount + stats.pendingAmount).toLocaleString("es-CL")}`, sub: "", icon: DollarSign, color: "text-rasma-dark", bg: "bg-rasma-lime/30" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rasma-dark text-rasma-lime flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-rasma-dark tracking-tight">Pagos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{total} registros</p>
          </div>
        </div>
        <Link href="/pagos/nuevo">
          <Button className="h-11 px-5 text-base font-semibold rounded-xl gap-2 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
            <Plus className="h-5 w-5" /> Nuevo Pago
          </Button>
        </Link>
      </div>

      {/* MP return banners */}
      {params.mp_status === "success" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 font-medium">
          Pago completado exitosamente a traves de MercadoPago.
        </div>
      )}
      {params.mp_status === "failure" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 font-medium">
          El pago no pudo ser procesado. Intente nuevamente.
        </div>
      )}
      {params.mp_status === "pending" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-medium">
          El pago esta siendo procesado por MercadoPago.
        </div>
      )}

      {/* ═══ STATS ═══ */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="rounded-2xl">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-2xl font-extrabold text-rasma-dark mt-1 tabular-nums">{stat.value}</p>
                  {stat.sub && <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>}
                </div>
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ FILTERS ═══ */}
      <Suspense>
        <FilterBar filters={paymentFilters} basePath="/pagos" />
      </Suspense>

      {/* ═══ TABLE ═══ */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Paciente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead className="hidden md:table-cell">Metodo</TableHead>
              <TableHead className="hidden md:table-cell">Fuente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No hay pagos registrados.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => {
                const patientName = `${p.patient.firstName} ${p.patient.lastName}`;
                const isMp = p.paymentMethod === "mercadopago";
                return (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <AvatarInitials name={patientName} size="sm" />
                        <span className="font-medium text-sm">{patientName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {new Date(p.date + "T12:00:00").toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}
                    </TableCell>
                    <TableCell className="text-sm font-semibold tabular-nums">
                      ${(p.amount / 100).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <div className="flex items-center gap-1.5">
                        {p.paymentMethod ? methodLabels[p.paymentMethod] || p.paymentMethod : "\u2014"}
                        {isMp && p.status === "pendiente" && p.checkoutUrl && (
                          <CopyCheckoutUrl url={p.checkoutUrl} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusBadge type="funding_source" status={p.fundingSource} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge type="payment" status={p.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentActions paymentId={p.id} currentStatus={p.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ═══ PAGINATION ═══ */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 pt-4">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) pageNum = i + 1;
            else if (currentPage <= 4) pageNum = i + 1;
            else if (currentPage >= totalPages - 3) pageNum = totalPages - 6 + i;
            else pageNum = currentPage - 3 + i;
            return (
              <Link
                key={pageNum}
                href={`/pagos?status=${params.status || "all"}&fundingSource=${params.fundingSource || "all"}&page=${pageNum}`}
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
