"use client";

import { useState, useActionState } from "react";
import { createSessionNote } from "@/actions/notes";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

interface Appointment {
  id: string;
  dateTime: Date;
  patient: { id: string; firstName: string; lastName: string };
}

export function NoteFormDialog({ appointments, preselectedId }: { appointments: Appointment[]; preselectedId?: string }) {
  const [open, setOpen] = useState(!!preselectedId);
  const router = useRouter();
  const [state, action, pending] = useActionState(async (
    prev: { error?: string; success?: boolean } | undefined,
    formData: FormData
  ) => {
    const result = await createSessionNote(prev, formData);
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
        <Plus className="h-4 w-4" /> Nueva Nota
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-rasma-dark">Nueva Nota Clínica (SOAP)</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>

            <form action={action} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cita *</label>
                <select name="appointmentId" required defaultValue={preselectedId || ""} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar cita completada...</option>
                  {appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.patient.firstName} {a.patient.lastName} — {new Date(a.dateTime).toLocaleDateString("es-CL")}
                    </option>
                  ))}
                </select>
              </div>

              {[
                { name: "subjective", label: "Subjetivo", placeholder: "Lo que el paciente reporta: síntomas, quejas, historia..." },
                { name: "objective", label: "Objetivo", placeholder: "Observaciones clínicas: conducta, estado emocional, pruebas..." },
                { name: "assessment", label: "Evaluación", placeholder: "Análisis clínico: diagnóstico, interpretación, progreso..." },
                { name: "plan", label: "Plan", placeholder: "Próximos pasos: intervenciones, tareas, frecuencia, derivaciones..." },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium mb-1">{field.label}</label>
                  <textarea name={field.name} rows={3} placeholder={field.placeholder} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}

              {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={pending}
                  className="px-4 py-2 text-sm bg-rasma-dark text-rasma-lime rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
                  {pending ? "Guardando..." : "Guardar Nota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
