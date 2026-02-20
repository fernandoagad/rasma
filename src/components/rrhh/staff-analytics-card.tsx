"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, BarChart3, Calendar } from "lucide-react";
import { getStaffAnalytics } from "@/actions/staff";

type AnalyticsData = NonNullable<Awaited<ReturnType<typeof getStaffAnalytics>>>;

function getCurrentQuarterStart(): string {
  const now = new Date();
  const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
  const start = new Date(now.getFullYear(), quarterMonth, 1);
  return start.toISOString().slice(0, 10);
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCLP(value: number): string {
  return `$${value.toLocaleString("es-CL")}`;
}

interface ComparisonBarProps {
  individual: number;
  team: number;
  label: string;
  teamLabel: string;
}

function ComparisonBar({ individual, team, label, teamLabel }: ComparisonBarProps) {
  const max = Math.max(individual, team, 1);
  const individualWidth = Math.round((individual / max) * 100);
  const teamWidth = Math.round((team / max) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="h-2 rounded-full bg-rasma-teal" style={{ width: `${individualWidth}%` }} />
        <span className="text-xs font-medium text-foreground shrink-0">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 rounded-full bg-muted" style={{ width: `${teamWidth}%` }} />
        <span className="text-xs text-muted-foreground shrink-0">Equipo: {teamLabel}</span>
      </div>
    </div>
  );
}

export function StaffAnalyticsCard({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showPanel, setShowPanel] = useState(false);
  const [dateFrom, setDateFrom] = useState(getCurrentQuarterStart);
  const [dateTo, setDateTo] = useState(getTodayString);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFetch() {
    setError(null);
    startTransition(async () => {
      const result = await getStaffAnalytics({ userId, dateFrom, dateTo });
      if (!result) {
        setError("No se pudieron obtener las analíticas. Verifique los permisos.");
        return;
      }
      setData(result);
    });
  }

  if (!showPanel) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Button variant="outline" onClick={() => setShowPanel(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver analíticas
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Analíticas de Desempeño
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date range selector */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" /> Desde
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" /> Hasta
            </Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <Button size="sm" onClick={handleFetch} disabled={isPending || !dateFrom || !dateTo}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar"}
          </Button>
        </div>

        {/* Loading state */}
        {isPending && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <p className="text-sm text-destructive text-center py-4">{error}</p>
        )}

        {/* Analytics grid */}
        {data && !isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Citas totales */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Citas totales</p>
                <p className="text-2xl font-bold">{data.appointments.total}</p>
                <p className="text-xs text-muted-foreground">
                  {data.appointments.completed} completadas · {data.appointments.cancelled} canceladas · {data.appointments.noShow} no asistió
                </p>
              </div>
              <ComparisonBar
                individual={data.appointments.total}
                team={data.teamAverage.appointments}
                label={String(data.appointments.total)}
                teamLabel={String(data.teamAverage.appointments)}
              />
            </div>

            {/* Pacientes atendidos */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pacientes atendidos</p>
                <p className="text-2xl font-bold">{data.uniquePatients}</p>
                <p className="text-xs text-muted-foreground">Pacientes únicos</p>
              </div>
              <ComparisonBar
                individual={data.uniquePatients}
                team={data.teamAverage.uniquePatients}
                label={String(data.uniquePatients)}
                teamLabel={String(data.teamAverage.uniquePatients)}
              />
            </div>

            {/* Ingresos generados */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Ingresos generados</p>
                <p className="text-2xl font-bold">{formatCLP(data.revenue)}</p>
                <p className="text-xs text-muted-foreground">CLP en el período</p>
              </div>
              <ComparisonBar
                individual={data.revenue}
                team={data.teamAverage.revenue}
                label={formatCLP(data.revenue)}
                teamLabel={formatCLP(data.teamAverage.revenue)}
              />
            </div>

            {/* Notas clínicas */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Notas clínicas</p>
                <p className="text-2xl font-bold">{data.notesCount}</p>
                <p className="text-xs text-muted-foreground">
                  Tasa de documentación: {data.notesRate}%
                </p>
              </div>
              <ComparisonBar
                individual={data.notesRate}
                team={data.teamAverage.notesRate}
                label={`${data.notesRate}%`}
                teamLabel={`${data.teamAverage.notesRate}%`}
              />
            </div>

            {/* Planes de tratamiento */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Planes de tratamiento</p>
                <p className="text-2xl font-bold">{data.plans.createdInPeriod}</p>
                <p className="text-xs text-muted-foreground">
                  Creados en el período · {data.plans.currentlyActive} activos actualmente
                </p>
              </div>
            </div>

            {/* Tasa de cumplimiento */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tasa de cumplimiento</p>
                <p className="text-2xl font-bold">{data.appointments.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Citas completadas vs agendadas</p>
              </div>
              <ComparisonBar
                individual={data.appointments.completionRate}
                team={data.teamAverage.completionRate}
                label={`${data.appointments.completionRate}%`}
                teamLabel={`${data.teamAverage.completionRate}%`}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
