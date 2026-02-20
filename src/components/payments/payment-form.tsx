"use client";

import { useActionState } from "react";
import { createPayment } from "@/actions/payments";
import { createMercadoPagoPayment } from "@/actions/payments";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";

interface Props {
  patients: { id: string; firstName: string; lastName: string; rut: string | null }[];
}

export function PaymentForm({ patients }: Props) {
  const [method, setMethod] = useState("");
  const [fundingSource, setFundingSource] = useState("paciente");
  const isMp = method === "mercadopago";
  const isFoundation = fundingSource === "fundacion";

  const [manualState, manualAction, manualPending] = useActionState(createPayment, undefined);
  const [mpState, mpAction, mpPending] = useActionState(createMercadoPagoPayment, undefined);

  const state = isMp ? mpState : manualState;
  const pending = isMp ? mpPending : manualPending;

  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (manualState?.success) router.push("/pagos");
  }, [manualState?.success, router]);

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // MP payment created successfully — show checkout URL
  if (mpState?.success && mpState.checkoutUrl) {
    return (
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-lg">Enlace de pago creado</h3>
          <p className="text-sm text-muted-foreground">
            Comparta el enlace con el paciente para que realice el pago a través de MercadoPago.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
          <input
            readOnly
            value={mpState.checkoutUrl}
            className="flex-1 bg-transparent text-sm truncate outline-none"
          />
          <button
            onClick={() => handleCopy(mpState.checkoutUrl!)}
            className="shrink-0 p-2 rounded-md hover:bg-background transition"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex gap-3">
          <a
            href={mpState.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-[#009ee3] text-white py-2.5 rounded-lg font-medium hover:opacity-90 transition text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir en MercadoPago
          </a>
          <button
            onClick={() => router.push("/pagos")}
            className="flex-1 bg-muted py-2.5 rounded-lg font-medium hover:bg-muted/80 transition text-sm"
          >
            Volver a Pagos
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={isMp ? mpAction : manualAction} className="bg-white border rounded-xl p-6 space-y-4">
      <input type="hidden" name="fundingSource" value={fundingSource} />

      <div>
        <label className="block text-sm font-medium mb-1">Financiado por *</label>
        <select
          value={fundingSource}
          onChange={(e) => setFundingSource(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="paciente">Paciente</option>
          <option value="fundacion">Fundación</option>
        </select>
      </div>

      {isFoundation && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
          <p className="text-sm text-teal-800">
            Pago financiado por la fundación. Se registrará como <strong>pagado</strong> vía <strong>transferencia</strong>.
          </p>
        </div>
      )}

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

      {!isFoundation && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Método de pago</label>
            <select
              name="paymentMethod"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          {!isMp && (
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select name="status" className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="parcial">Parcial</option>
              </select>
            </div>
          )}
        </div>
      )}

      {isMp && !isFoundation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            Se creará un enlace de pago de MercadoPago. El pago se registrará como <strong>pendiente</strong> hasta que el paciente complete el pago.
          </p>
        </div>
      )}

      {!isMp && !isFoundation && (
        <div>
          <label className="block text-sm font-medium mb-1">N° Boleta</label>
          <input type="text" name="receiptNumber" placeholder="Opcional" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Notas</label>
        <textarea name="notes" rows={2} placeholder="Notas adicionales..." className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending}
        className={`w-full py-2.5 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 ${
          isMp
            ? "bg-[#009ee3] text-white"
            : "bg-rasma-dark text-rasma-lime"
        }`}>
        {pending
          ? "Procesando..."
          : isMp
            ? "Crear Enlace de Pago"
            : "Registrar Pago"
        }
      </button>
    </form>
  );
}
