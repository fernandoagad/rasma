"use client";

import { useActionState } from "react";
import { createPayment } from "@/actions/payments";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  patients: { id: string; firstName: string; lastName: string; rut: string | null }[];
}

export function PaymentForm({ patients }: Props) {
  const [state, action, pending] = useActionState(createPayment, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) router.push("/pagos");
  }, [state?.success, router]);

  return (
    <form action={action} className="bg-white border rounded-xl p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Paciente *</label>
        <select name="patientId" required className="w-full border rounded-lg px-3 py-2 text-sm">
          <option value="">Seleccionar paciente...</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.lastName}, {p.firstName}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Monto (CLP) *</label>
          <input type="number" name="amount" required min={1} placeholder="25000" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fecha *</label>
          <input type="date" name="date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Método de pago</label>
          <select name="paymentMethod" className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Seleccionar...</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Estado</label>
          <select name="status" className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="parcial">Parcial</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">N° Boleta</label>
        <input type="text" name="receiptNumber" placeholder="Opcional" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notas</label>
        <textarea name="notes" rows={2} placeholder="Notas adicionales..." className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending}
        className="w-full bg-rasma-dark text-rasma-lime py-2.5 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50">
        {pending ? "Registrando..." : "Registrar Pago"}
      </button>
    </form>
  );
}
