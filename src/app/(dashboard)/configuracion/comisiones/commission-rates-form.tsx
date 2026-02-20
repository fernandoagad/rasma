"use client";

import { useActionState } from "react";
import { updateCommissionRates, type CommissionRates } from "@/actions/commissions";
import { useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, UserCheck } from "lucide-react";

function RateInput({
  name,
  label,
  description,
  defaultValue,
}: {
  name: string;
  label: string;
  description: string;
  defaultValue: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="relative w-40">
        <input
          type="number"
          name={name}
          required
          min={0}
          max={100}
          step={0.01}
          defaultValue={(defaultValue / 100).toFixed(2)}
          className="w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          %
        </span>
      </div>
    </div>
  );
}

export function CommissionRatesForm({ rates }: { rates: CommissionRates }) {
  const [state, action, pending] = useActionState(
    updateCommissionRates,
    undefined
  );

  useEffect(() => {
    if (state?.success) toast.success("Tarifas actualizadas.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-rasma-teal" />
            Comisión de la Fundación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RateInput
            name="commissionInternalRate"
            label="Pacientes Fundación"
            description="Porcentaje que retiene la fundación por pacientes atendidos internamente."
            defaultValue={rates.commissionInternalRate}
          />
          <RateInput
            name="commissionExternalRate"
            label="Pacientes Externos"
            description="Porcentaje que retiene la fundación por pacientes externos."
            defaultValue={rates.commissionExternalRate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 text-rasma-teal" />
            Descuento en Liquidaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RateInput
            name="payoutDeductionMonthly"
            label="Pago Mensual"
            description="Descuento adicional cuando se paga al profesional en liquidación mensual."
            defaultValue={rates.payoutDeductionMonthly}
          />
          <RateInput
            name="payoutDeductionPerPayment"
            label="Pago por Sesión"
            description="Descuento adicional cuando se paga al profesional por cada pago recibido."
            defaultValue={rates.payoutDeductionPerPayment}
          />
        </CardContent>
      </Card>

      <button
        type="submit"
        disabled={pending}
        className="bg-rasma-dark text-rasma-lime px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
      >
        {pending ? "Guardando..." : "Guardar Tarifas"}
      </button>
    </form>
  );
}
