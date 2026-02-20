import { getReportData } from "@/actions/reports";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BarChart3, Users, Calendar, DollarSign, TrendingUp, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

const sessionTypeLabels: Record<string, string> = {
  individual: "Individual",
  pareja: "Pareja",
  familiar: "Familiar",
  grupal: "Grupal",
  evaluacion: "Evaluación",
};

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "supervisor"].includes(session.user.role)) redirect("/");

  const params = await searchParams;
  const data = await getReportData({ dateFrom: params.dateFrom, dateTo: params.dateTo });

  const statCards = [
    {
      title: "Pacientes",
      value: data.patients.total,
      sub: `${data.patients.active} activos`,
      icon: Users,
      color: "text-rasma-teal",
      bg: "bg-rasma-teal/10",
    },
    {
      title: "Citas",
      value: data.appointments.total,
      sub: `${data.appointments.completed} completadas`,
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Tasa cumplimiento",
      value: `${data.appointments.completionRate}%`,
      sub: `${data.appointments.noShow} no asistieron`,
      icon: TrendingUp,
      color: "text-rasma-green",
      bg: "bg-rasma-green/10",
    },
    {
      title: "Ingresos",
      value: `$${data.revenue.collected.toLocaleString("es-CL")}`,
      sub: `$${data.revenue.pending.toLocaleString("es-CL")} pendiente`,
      icon: DollarSign,
      color: "text-rasma-green",
      bg: "bg-rasma-green/10",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Reportes"
        subtitle={`Período: ${new Date(data.dateFrom).toLocaleDateString("es-CL")} — ${new Date(data.dateTo).toLocaleDateString("es-CL")}`}
      />

      {/* Date filters */}
      <Card>
        <CardContent className="pt-2">
          <form className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Desde</label>
              <input type="date" name="dateFrom" defaultValue={data.dateFrom} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Hasta</label>
              <input type="date" name="dateTo" defaultValue={data.dateTo} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <Button type="submit" size="sm">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Therapist workload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-5 w-5" /> Carga por Terapeuta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.therapistStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos para este período.</p>
          ) : (
            <div className="space-y-3">
              {data.therapistStats.map((t) => (
                <div key={t.therapistId} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.therapistName}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48 bg-muted rounded-full h-2.5">
                      <div className="bg-rasma-teal h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.min((t.appointmentCount / Math.max(...data.therapistStats.map(s => s.appointmentCount))) * 100, 100)}%` }} />
                    </div>
                    <span className="text-sm font-bold w-8 text-right">{t.appointmentCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session type breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Tipos de Sesión
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.sessionTypeStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos para este período.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {data.sessionTypeStats.map((s) => (
                <div key={s.sessionType} className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-xs text-muted-foreground">{sessionTypeLabels[s.sessionType!] || s.sessionType}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
