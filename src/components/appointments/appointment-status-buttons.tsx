"use client";

import { updateAppointmentStatus } from "@/actions/appointments";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

export function AppointmentStatusButtons({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleStatus(status: string) {
    setLoading(status);
    await updateAppointmentStatus(appointmentId, status);
    setLoading(null);
    router.refresh();
  }

  async function handleCancel() {
    if (!confirm("Seguro que desea cancelar esta cita? Esta accion no se puede deshacer.")) return;
    handleStatus("cancelada");
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cambiar estado</p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => handleStatus("completada")}
          disabled={loading !== null}
          className="gap-2 rounded-xl bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90"
        >
          {loading === "completada" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Completada
        </Button>
        <Button
          onClick={() => handleStatus("no_asistio")}
          disabled={loading !== null}
          variant="outline"
          className="gap-2 rounded-xl border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
        >
          {loading === "no_asistio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          No asistio
        </Button>
      </div>
      <div className="pt-2 border-t">
        <Button
          onClick={handleCancel}
          disabled={loading !== null}
          variant="outline"
          className="gap-2 rounded-xl w-full sm:w-auto border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 font-semibold"
        >
          {loading === "cancelada" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Cancelar esta cita
        </Button>
      </div>
    </div>
  );
}
