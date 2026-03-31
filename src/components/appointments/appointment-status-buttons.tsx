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

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cambiar estado</p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => handleStatus("completada")}
          disabled={loading !== null}
          variant="outline"
          className="gap-2 bg-rasma-dark text-white hover:bg-rasma-dark/90"
        >
          {loading === "completada" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Completada
        </Button>
        <Button
          onClick={() => handleStatus("no_asistio")}
          disabled={loading !== null}
          variant="outline"
          className="gap-2 border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
        >
          {loading === "no_asistio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          No asistio
        </Button>
        <Button
          onClick={() => handleStatus("cancelada")}
          disabled={loading !== null}
          variant="outline"
          className="gap-2 border-rasma-red/30 text-rasma-red hover:bg-rasma-red/5"
        >
          {loading === "cancelada" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Cancelar
        </Button>
      </div>
    </div>
  );
}
