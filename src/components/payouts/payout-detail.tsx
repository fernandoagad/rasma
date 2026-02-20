"use client";

import { useActionState } from "react";
import { markPayoutPaid } from "@/actions/payouts";
import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { CheckCircle, Building2, User } from "lucide-react";

interface PayoutData {
  id: string;
  therapist: { id: string; name: string; email: string | null };
  periodStart: string;
  periodEnd: string;
  payoutType: string;
  grossAmount: number;
  commissionAmount: number;
  deductionAmount: number;
  netAmount: number;
  status: string;
  bankTransferRef: string | null;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  items: {
    id: string;
    patientType: string;
    paymentAmount: number;
    commissionRate: number;
    commissionAmount: number;
    payment: {
      id: string;
      patient: { id: string; firstName: string; lastName: string };
    };
  }[];
  bankAccount: {
    bankName: string;
    accountType: string;
    accountNumber: string;
    holderRut: string;
    holderName: string;
    email: string | null;
  } | null | undefined;
}

const accountTypeLabels: Record<string, string> = {
  corriente: "Cuenta Corriente",
  vista: "Cuenta Vista",
  ahorro: "Cuenta de Ahorro",
  rut: "Cuenta RUT",
};

export function PayoutDetail({ payout, userRole = "admin" }: { payout: PayoutData; userRole?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(markPayoutPaid, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success("Liquidación marcada como pagada.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <div className="space-y-6">
      {/* Status & summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Resumen</CardTitle>
            <StatusBadge type="payout" status={payout.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tipo de pago</p>
              <p className="font-medium">{payout.payoutType === "mensual" ? "Mensual" : "Por sesión"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Creada el</p>
              <p className="font-medium">{new Date(payout.createdAt).toLocaleDateString("es-CL")}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto bruto</span>
              <span>${(payout.grossAmount / 100).toLocaleString("es-CL")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Comisión fundación</span>
              <span className="text-red-600">-${(payout.commissionAmount / 100).toLocaleString("es-CL")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descuento</span>
              <span className="text-red-600">-${(payout.deductionAmount / 100).toLocaleString("es-CL")}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Neto a pagar</span>
              <span className="font-bold text-lg">${(payout.netAmount / 100).toLocaleString("es-CL")}</span>
            </div>
          </div>

          {payout.notes && (
            <div className="mt-4 text-sm">
              <p className="text-muted-foreground">Notas</p>
              <p>{payout.notes}</p>
            </div>
          )}

          {payout.bankTransferRef && (
            <div className="mt-4 text-sm">
              <p className="text-muted-foreground">Ref. transferencia</p>
              <p className="font-mono">{payout.bankTransferRef}</p>
            </div>
          )}

          {payout.paidAt && (
            <div className="mt-2 text-sm">
              <p className="text-muted-foreground">Pagado el</p>
              <p>{new Date(payout.paidAt).toLocaleDateString("es-CL")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank account */}
      {payout.bankAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-rasma-teal" />
              Datos Bancarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Banco</p>
                <p className="font-medium">{payout.bankAccount.bankName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo de cuenta</p>
                <p className="font-medium">{accountTypeLabels[payout.bankAccount.accountType] || payout.bankAccount.accountType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">N° Cuenta</p>
                <p className="font-mono">{payout.bankAccount.accountNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">RUT Titular</p>
                <p className="font-mono">{payout.bankAccount.holderRut}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Titular</p>
                <p className="font-medium">{payout.bankAccount.holderName}</p>
              </div>
              {payout.bankAccount.email && (
                <div>
                  <p className="text-muted-foreground">Email notificación</p>
                  <p>{payout.bankAccount.email}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!payout.bankAccount && (
        <Card>
          <CardContent className="py-4 text-center text-sm text-muted-foreground">
            <User className="h-5 w-5 mx-auto mb-2" />
            El terapeuta no ha registrado datos bancarios.
          </CardContent>
        </Card>
      )}

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle ({payout.items.length} pagos)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Paciente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Comisión %</TableHead>
                <TableHead className="text-right pr-4">Comisión $</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payout.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-4 text-sm">
                    {item.payment.patient.firstName} {item.payment.patient.lastName}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {item.patientType === "externo" ? "Externo" : "Fundación"}
                  </TableCell>
                  <TableCell className="text-sm text-right">
                    ${(item.paymentAmount / 100).toLocaleString("es-CL")}
                  </TableCell>
                  <TableCell className="text-sm text-right">
                    {(item.commissionRate / 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-sm text-right pr-4">
                    ${(item.commissionAmount / 100).toLocaleString("es-CL")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mark as paid */}
      {payout.status !== "pagado" && userRole === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-rasma-green" />
              Marcar como Pagado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-3">
              <input type="hidden" name="payoutId" value={payout.id} />
              <div>
                <label className="block text-sm font-medium mb-1">Referencia de transferencia (opcional)</label>
                <input
                  type="text"
                  name="bankTransferRef"
                  placeholder="Ej: TRF-20260220-001"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="w-full bg-rasma-green text-white py-2.5 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-40"
              >
                {pending ? "Procesando..." : "Confirmar Pago"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
