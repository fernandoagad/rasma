"use client";

import { useActionState } from "react";
import { upsertBankAccount } from "@/actions/bank-accounts";
import { useEffect } from "react";
import { toast } from "sonner";
import { CHILEAN_BANKS, ACCOUNT_TYPES } from "@/constants/banks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark } from "lucide-react";

interface BankAccountData {
  bankName: string;
  accountType: string;
  accountNumber: string;
  holderRut: string;
  holderName: string;
  email: string | null;
}

export function BankAccountForm({
  userId,
  bankAccount,
}: {
  userId: string;
  bankAccount?: BankAccountData | null;
}) {
  const [state, action, pending] = useActionState(upsertBankAccount, undefined);

  useEffect(() => {
    if (state?.success) toast.success("Datos bancarios guardados.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4 text-rasma-teal" />
          Datos Bancarios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="userId" value={userId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Banco *</label>
              <select
                name="bankName"
                required
                defaultValue={bankAccount?.bankName || ""}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
              >
                <option value="">Seleccionar banco...</option>
                {CHILEAN_BANKS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de Cuenta *</label>
              <select
                name="accountType"
                required
                defaultValue={bankAccount?.accountType || ""}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
              >
                <option value="">Seleccionar tipo...</option>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">N° de Cuenta *</label>
              <input
                type="text"
                name="accountNumber"
                required
                defaultValue={bankAccount?.accountNumber || ""}
                placeholder="Ej: 12345678"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">RUT del Titular *</label>
              <input
                type="text"
                name="holderRut"
                required
                defaultValue={bankAccount?.holderRut || ""}
                placeholder="Ej: 12.345.678-9"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Nombre del Titular *
              </label>
              <input
                type="text"
                name="holderName"
                required
                defaultValue={bankAccount?.holderName || ""}
                placeholder="Nombre completo"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Email (para notificación)
              </label>
              <input
                type="email"
                name="email"
                defaultValue={bankAccount?.email || ""}
                placeholder="correo@ejemplo.cl"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="bg-rasma-dark text-rasma-lime px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
          >
            {pending ? "Guardando..." : "Guardar Datos Bancarios"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
