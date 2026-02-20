"use client";

import { useState, useActionState } from "react";
import { calculateTherapistPayout, createPayout } from "@/actions/payouts";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calculator, Save } from "lucide-react";

interface Props {
  therapists: { id: string; name: string; email: string | null }[];
}

type CalcResult = Awaited<ReturnType<typeof calculateTherapistPayout>>;

export function PayoutCalculator({ therapists }: Props) {
  const router = useRouter();
  const [therapistId, setTherapistId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [payoutType, setPayoutType] = useState<"mensual" | "por_pago">("mensual");
  const [calculation, setCalculation] = useState<CalcResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");

  const [createState, createAction, createPending] = useActionState(createPayout, undefined);

  useEffect(() => {
    if (createState?.success) {
      toast.success("Liquidación creada exitosamente.");
      router.push("/pagos/liquidaciones");
    }
    if (createState?.error) toast.error(createState.error);
  }, [createState, router]);

  async function handleCalculate() {
    if (!therapistId || !periodStart || !periodEnd) {
      setCalcError("Complete todos los campos.");
      return;
    }
    setCalcError("");
    setCalculating(true);
    try {
      const result = await calculateTherapistPayout({
        therapistId,
        periodStart,
        periodEnd,
        payoutType,
      });
      setCalculation(result);
    } catch (err: unknown) {
      setCalcError(err instanceof Error ? err.message : "Error al calcular.");
    } finally {
      setCalculating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parámetros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Terapeuta *</label>
            <select
              value={therapistId}
              onChange={(e) => { setTherapistId(e.target.value); setCalculation(null); }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Seleccionar terapeuta...</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Inicio del período *</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => { setPeriodStart(e.target.value); setCalculation(null); }}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fin del período *</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => { setPeriodEnd(e.target.value); setCalculation(null); }}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de pago *</label>
            <select
              value={payoutType}
              onChange={(e) => { setPayoutType(e.target.value as "mensual" | "por_pago"); setCalculation(null); }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="mensual">Mensual</option>
              <option value="por_pago">Por sesión</option>
            </select>
          </div>

          {calcError && <p className="text-sm text-red-600">{calcError}</p>}

          <button
            type="button"
            onClick={handleCalculate}
            disabled={calculating}
            className="flex items-center gap-2 bg-rasma-teal text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
          >
            <Calculator className="h-4 w-4" />
            {calculating ? "Calculando..." : "Calcular"}
          </button>
        </CardContent>
      </Card>

      {/* Results */}
      {calculation && (
        <>
          {calculation.items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay pagos en el período seleccionado para este terapeuta.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Line items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Detalle de Pagos ({calculation.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Paciente</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-right">Comisión %</TableHead>
                        <TableHead className="text-right pr-4">Comisión $</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculation.items.map((item) => (
                        <TableRow key={item.paymentId}>
                          <TableCell className="pl-4 text-sm">{item.patientName}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(item.paymentDate + "T12:00:00").toLocaleDateString("es-CL")}
                          </TableCell>
                          <TableCell className="text-sm capitalize">{item.patientType === "externo" ? "Externo" : "Fundación"}</TableCell>
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

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto bruto</span>
                      <span className="font-medium">${(calculation.grossAmount / 100).toLocaleString("es-CL")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comisión fundación</span>
                      <span className="text-red-600">-${(calculation.commissionAmount / 100).toLocaleString("es-CL")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Descuento {payoutType === "mensual" ? "mensual" : "por sesión"} ({(calculation.deductionRate / 100).toFixed(1)}%)
                      </span>
                      <span className="text-red-600">-${(calculation.deductionAmount / 100).toLocaleString("es-CL")}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Neto a pagar</span>
                      <span className="font-bold text-lg">${(calculation.netAmount / 100).toLocaleString("es-CL")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save form */}
              <form action={createAction}>
                <input type="hidden" name="therapistId" value={therapistId} />
                <input type="hidden" name="periodStart" value={periodStart} />
                <input type="hidden" name="periodEnd" value={periodEnd} />
                <input type="hidden" name="payoutType" value={payoutType} />

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Notas adicionales..."
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {createState?.error && <p className="text-sm text-red-600 mb-3">{createState.error}</p>}

                <button
                  type="submit"
                  disabled={createPending}
                  className="flex items-center gap-2 w-full justify-center bg-rasma-dark text-rasma-lime py-2.5 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {createPending ? "Creando..." : "Crear Liquidación"}
                </button>
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}
