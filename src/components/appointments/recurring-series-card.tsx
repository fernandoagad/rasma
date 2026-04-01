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
import { formatChileTime, formatChileDate } from "@/lib/timezone";

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
  const noShowCount = appointments.filter((a) => a.status === "no_asistio").length;
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
    <Card className="border-border bg-zinc-50/50 rounded-2xl">
      <CardContent className="pt-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-rasma-dark" />
            <p className="text-sm font-semibold text-rasma-dark">
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
                className="gap-1.5 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
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

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex h-2 rounded-full overflow-hidden bg-zinc-200">
            {completedCount > 0 && (
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(completedCount / appointments.length) * 100}%` }}
              />
            )}
            {futureScheduled.length > 0 && (
              <div
                className="bg-blue-400 transition-all"
                style={{ width: `${(futureScheduled.length / appointments.length) * 100}%` }}
              />
            )}
            {noShowCount > 0 && (
              <div
                className="bg-amber-400 transition-all"
                style={{ width: `${(noShowCount / appointments.length) * 100}%` }}
              />
            )}
            {cancelledCount > 0 && (
              <div
                className="bg-red-300 transition-all"
                style={{ width: `${(cancelledCount / appointments.length) * 100}%` }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {completedCount} completada{completedCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              {futureScheduled.length} programada{futureScheduled.length !== 1 ? "s" : ""}
            </span>
            {noShowCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {noShowCount} no asistio
              </span>
            )}
            {cancelledCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-300" />
                {cancelledCount} cancelada{cancelledCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
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
                    "flex items-center justify-between p-2.5 rounded-xl text-sm transition-colors",
                    isCurrent
                      ? "bg-white border border-zinc-300 shadow-sm"
                      : "hover:bg-zinc-100/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-rasma-dark" />}
                    <span className={cn("capitalize", isCurrent && "font-semibold")}>
                      {formatChileDate(dt, { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span className="text-muted-foreground">
                      {formatChileTime(dt)}
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
