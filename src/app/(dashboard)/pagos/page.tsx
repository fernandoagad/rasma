import { getPayments, getPaymentStats } from "@/actions/payments";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, DollarSign, Clock, CheckCircle } from "lucide-react";
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
import { Suspense } from "react";

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
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
];

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "terapeuta") redirect("/");

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [{ payments, total, totalPages, currentPage }, stats] = await Promise.all([
    getPayments({ status: params.status, page }),
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
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
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay pagos registrados.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => {
                const patientName = `${p.patient.firstName} ${p.patient.lastName}`;
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
                      {p.paymentMethod ? methodLabels[p.paymentMethod] : "—"}
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
            <Link key={p} href={`/pagos?status=${params.status || "all"}&page=${p}`}
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
