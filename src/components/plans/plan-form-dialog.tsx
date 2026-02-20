"use client";

import { useState, useActionState } from "react";
import { createTreatmentPlan } from "@/actions/plans";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

interface Props {
  patients: { id: string; firstName: string; lastName: string; rut: string | null }[];
}

export function PlanFormDialog({ patients }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState(async (
    prev: { error?: string; success?: boolean } | undefined,
    formData: FormData
  ) => {
    const result = await createTreatmentPlan(prev, formData);
    if (result?.success) {
      setOpen(false);
      router.refresh();
    }
    return result;
  }, undefined);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-rasma-dark text-rasma-lime px-4 py-2 rounded-lg font-medium hover:opacity-90 transition">
        <Plus className="h-4 w-4" /> Nuevo Plan
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-rasma-dark">Nuevo Plan de Tratamiento</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>

            <form action={action} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Paciente *</label>
                <select name="patientId" required className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.lastName}, {p.firstName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Diagnóstico</label>
                <textarea name="diagnosis" rows={2} placeholder="Diagnóstico clínico..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Objetivos</label>
                <textarea name="goals" rows={3} placeholder="Objetivos terapéuticos..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Intervenciones</label>
                <textarea name="interventions" rows={3} placeholder="Intervenciones planificadas..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha inicio *</label>
                  <input type="date" name="startDate" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Próxima revisión</label>
                  <input type="date" name="nextReviewDate" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={pending}
                  className="px-4 py-2 text-sm bg-rasma-dark text-rasma-lime rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
                  {pending ? "Creando..." : "Crear Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
