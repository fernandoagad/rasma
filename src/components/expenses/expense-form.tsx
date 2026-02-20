"use client";

import { useActionState } from "react";
import { createExpense } from "@/actions/expenses";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ExpenseForm() {
  const [state, action, pending] = useActionState(createExpense, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) router.push("/gastos");
  }, [state?.success, router]);

  return (
    <form action={action} className="bg-white border rounded-xl p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Descripci&oacute;n *
        </label>
        <input
          type="text"
          name="description"
          required
          placeholder="Ej: Pago arriendo oficina enero"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Monto (CLP) *
          </label>
          <input
            type="number"
            name="amount"
            required
            min={1}
            placeholder="150000"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fecha *</label>
          <input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().split("T")[0]}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Categor&iacute;a *
        </label>
        <select
          name="category"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Seleccionar...</option>
          <option value="arriendo">Arriendo</option>
          <option value="servicios_basicos">Servicios B&aacute;sicos</option>
          <option value="suministros">Suministros</option>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="seguros">Seguros</option>
          <option value="marketing">Marketing</option>
          <option value="software">Software</option>
          <option value="otros">Otros</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Comprobante (opcional)
        </label>
        <input
          type="file"
          name="receipt"
          accept="image/*,.pdf"
          className="w-full border rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-rasma-lime/30 file:px-3 file:py-1 file:text-sm file:font-medium file:text-rasma-dark"
        />
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG, WebP o PDF. M&aacute;x 10 MB.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notas</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="Notas adicionales..."
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-rasma-dark text-rasma-lime py-2.5 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {pending ? "Registrando..." : "Registrar Gasto"}
      </button>
    </form>
  );
}
