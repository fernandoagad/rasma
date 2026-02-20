import { getPayments, getPaymentStats } from "@/actions/payments";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, DollarSign, Clock, CheckCircle, ExternalLink, Copy } from "lucide-react";
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
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { FilterBar } from "@/components/ui/filter-bar";
import { Button } from "@/components/ui/button";
import { PaymentActions } from "@/components/payments/payment-actions";
import { CopyCheckoutUrl } from "@/components/payments/copy-checkout-url";
import { Badge } from "@/components/ui/badge";
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
      { value: "fundacion", label: "Fundación" },
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
    {
      title: "Cobrado",
      value: `$${stats.paidAmount.toLocaleString("es-CL")}`,
      sub: `${stats.paidCount} pagos`,
      icon: CheckCircle,
      color: "text-rasma-green",
      bg: "bg-rasma-green/10",
    },
    {
      title: "Pendiente",
      value: `$${stats.pendingAmount.toLocaleString("es-CL")}`,
      sub: `${stats.pendingCount} pagos`,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "Fundación",
      value: `$${stats.foundationPaidAmount.toLocaleString("es-CL")}`,
      sub: `${stats.foundationPaidCount} pagos`,
      icon: CreditCard,
      color: "text-rasma-teal",
      bg: "bg-rasma-teal/10",
    },
    {
      title: "Total",
      value: `$${(stats.paidAmount + stats.pendingAmount).toLocaleString("es-CL")}`,
      sub: "",
      icon: DollarSign,
      color: "text-rasma-teal",
      bg: "bg-rasma-teal/10",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Pagos"
        subtitle={`${total} registros`}
        action={
          <Link href="/pagos/nuevo">
            <Button>
              <CreditCard className="mr-2 h-4 w-4" /> Nuevo Pago
            </Button>
          </Link>
        }
      />

      {/* MP return status banner */}
      {params.mp_status === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Pago completado exitosamente a través de MercadoPago.
        </div>
      )}
      {params.mp_status === "failure" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          El pago no pudo ser procesado. Intente nuevamente.
        </div>
      )}
      {params.mp_status === "pending" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          El pago está siendo procesado por MercadoPago.
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  {stat.sub && <p className="text-xs text-muted-foreground">{stat.sub}</p>}
                </div>
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Suspense>
        <FilterBar filters={paymentFilters} basePath="/pagos" />
      </Suspense>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Paciente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead className="hidden md:table-cell">Método</TableHead>
              <TableHead className="hidden md:table-cell">Fuente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    <TableCell className="text-sm">
                      {new Date(p.date + "T12:00:00").toLocaleDateString("es-CL")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      ${(p.amount / 100).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <div className="flex items-center gap-1.5">
                        {p.paymentMethod ? methodLabels[p.paymentMethod] || p.paymentMethod : "—"}
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

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/pagos?status=${params.status || "all"}&fundingSource=${params.fundingSource || "all"}&page=${p}`}
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
