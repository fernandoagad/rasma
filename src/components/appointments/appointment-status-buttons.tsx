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
          className="gap-2 border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:text-green-900"
        >
          {loading === "completada" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Completada
        </Button>
        <Button
          onClick={() => handleStatus("no_asistio")}
          disabled={loading !== null}
          variant="outline"
          className="gap-2 border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-900"
        >
          {loading === "no_asistio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          No asistio
        </Button>
        <Button
          onClick={() => handleStatus("cancelada")}
          disabled={loading !== null}
          variant="outline"
          className="gap-2 border-red-200 bg-red-50 text-red-800 hover:bg-red-100 hover:text-red-900"
        >
          {loading === "cancelada" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Cancelar
        </Button>
      </div>
    </div>
  );
}
