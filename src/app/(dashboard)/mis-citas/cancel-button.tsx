"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelMyAppointment } from "@/actions/patient-portal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CancelAppointmentButton({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCancel() {
    if (!confirm("¿Estás seguro de que deseas cancelar esta cita?")) return;

    setLoading(true);
    try {
      const result = await cancelMyAppointment(appointmentId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Cita cancelada exitosamente.");
        router.refresh();
      }
    } catch {
      toast.error("Ocurrió un error al cancelar la cita.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={loading}
      onClick={handleCancel}
    >
      {loading ? "Cancelando..." : "Cancelar cita"}
    </Button>
  );
}
