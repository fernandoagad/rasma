"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Repeat, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { getRecurringGroupAppointments, cancelRecurringGroup } from "@/actions/appointments";
import { cn } from "@/lib/utils";

interface RecurringSeriesCardProps {
  groupId: string;
  currentId: string;
}

export function RecurringSeriesCard({ groupId, currentId }: RecurringSeriesCardProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Awaited<ReturnType<typeof getRecurringGroupAppointments>>>([]);
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getRecurringGroupAppointments(groupId).then((data) => {
      setAppointments(data);
      setLoaded(true);
    });
  }, [groupId]);

  const futureScheduled = appointments.filter(
    (a) => new Date(a.dateTime) >= new Date() && a.status === "programada"
  );

  const completedCount = appointments.filter((a) => a.status === "completada").length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelada").length;

  async function handleCancelFuture() {
    if (!confirm(`Se cancelaran ${futureScheduled.length} citas futuras programadas. Continuar?`)) return;
    setCancelling(true);
    await cancelRecurringGroup(groupId, true);
    setCancelling(false);
    router.refresh();
  }

  if (!loaded) return null;

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardContent className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-semibold text-purple-900">
              Serie recurrente ({appointments.length} citas)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {futureScheduled.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelFuture}
                disabled={cancelling}
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Cancelar futuras ({futureScheduled.length})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="gap-1"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? "Ocultar" : "Ver serie"}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{completedCount} completada{completedCount !== 1 ? "s" : ""}</span>
          <span>{futureScheduled.length} programada{futureScheduled.length !== 1 ? "s" : ""}</span>
          {cancelledCount > 0 && <span>{cancelledCount} cancelada{cancelledCount !== 1 ? "s" : ""}</span>}
        </div>

        {/* Expanded list */}
        {expanded && (
          <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
            {appointments.map((appt) => {
              const dt = new Date(appt.dateTime);
              const isCurrent = appt.id === currentId;
              return (
                <Link
                  key={appt.id}
                  href={`/citas/${appt.id}`}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-sm transition-colors",
                    isCurrent
                      ? "bg-purple-100 border border-purple-300"
                      : "hover:bg-purple-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />}
                    <span className={cn("capitalize", isCurrent && "font-semibold")}>
                      {dt.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span className="text-muted-foreground">
                      {dt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <StatusBadge type="appointment" status={appt.status} />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
