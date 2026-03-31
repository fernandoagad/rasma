import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Users,
  Calendar,
  CreditCard,
  FileText,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { UpcomingAppointments } from "@/components/dashboard/upcoming-appointments";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { NextAppointment } from "@/components/dashboard/next-appointment";
import {
  getDashboardStats,
  getRecentActivity,
  getUpcomingAppointments,
  getTodayAppointments,
} from "@/actions/dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;

  // Redirect non-staff roles to their appropriate pages
  if (role === "paciente") redirect("/mis-citas");
  if (role === "invitado") redirect("/pendiente");

  const firstName = session.user.name?.split(" ")[0] || "usuario";

  const [stats, activities, upcoming, todayAppts] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(8),
    getUpcomingAppointments(5),
    getTodayAppointments(),
  ]);

  // Serialize dates for client components
  const todaySerialized = todayAppts.map((a) => ({
    ...a,
    dateTime: a.dateTime instanceof Date ? a.dateTime.toISOString() : String(a.dateTime),
  }));

  // Find next/current appointment for the hero card
  const now = new Date();
  const nextAppt = todaySerialized.find((a) => {
    if (a.status !== "programada") return false;
    const start = new Date(a.dateTime);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + a.durationMinutes);
    return now <= end; // current or upcoming
  }) ?? null;

  const today = new Date();
  const dateStr = today.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const completedToday = todayAppts.filter((a) => a.status === "completada").length;
  const scheduledToday = todayAppts.filter((a) => a.status === "programada").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── Header: greeting + date ─── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-rasma-dark tracking-tight">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-base text-muted-foreground capitalize mt-1">{dateStr}</p>
      </div>

      {/* ─── Quick actions: big obvious cards ─── */}
      <QuickActions userRole={role} />

      {/* ─── Stats row: big, obvious cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={role === "terapeuta" ? "Mis pacientes" : "Pacientes"} value={stats.patientCount} icon={<Users className="h-4 w-4" />} href="/pacientes" />
        <StatCard label="Citas hoy" value={stats.todayAppointments} icon={<Calendar className="h-4 w-4" />} href="/citas" />
        {(role === "admin" || role === "recepcionista" || role === "supervisor") ? (
          <StatCard label="Pagos pendientes" value={stats.pendingPayments} icon={<CreditCard className="h-4 w-4" />} href="/pagos" alert={stats.pendingPayments > 0} />
        ) : (
          <StatCard label="Completadas esta semana" value={stats.completedThisWeek} icon={<CheckCircle2 className="h-4 w-4" />} href="/citas" />
        )}
        {(role === "terapeuta" || role === "supervisor" || role === "admin") ? (
          <StatCard label="Notas pendientes" value={stats.pendingNotes} icon={<FileText className="h-4 w-4" />} href="/notas" alert={stats.pendingNotes > 0} />
        ) : (
          <StatCard label="Citas esta semana" value={stats.weekAppointments} icon={<CalendarDays className="h-4 w-4" />} href="/calendario" />
        )}
      </div>

      {/* ─── Main grid ─── */}
      <div className="grid gap-5 lg:grid-cols-12">

        {/* ─── LEFT: Hero + Today Timeline ─── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">

          {/* Next / Current Appointment Hero */}
          <NextAppointment appointment={nextAppt} userRole={role} />

          {/* Alert banners */}
          {stats.pendingNotes > 0 && (role === "terapeuta" || role === "supervisor" || role === "admin") && (
            <Link href="/notas" className="block group">
              <div className="flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors group-hover:bg-zinc-50">
                <FileText className="h-4 w-4 text-rasma-dark shrink-0" />
                <p className="text-sm flex-1">
                  <span className="font-bold text-rasma-dark">
                    {stats.pendingNotes} {stats.pendingNotes === 1 ? "nota pendiente" : "notas pendientes"}
                  </span>
                  <span className="text-zinc-500 ml-1">— citas completadas sin nota de sesión</span>
                </p>
                <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
              </div>
            </Link>
          )}

          {stats.pendingPayments > 0 && (role === "admin" || role === "recepcionista" || role === "supervisor") && (
            <Link href="/pagos" className="block group">
              <div className="flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors group-hover:bg-zinc-50">
                <CreditCard className="h-4 w-4 text-rasma-dark shrink-0" />
                <p className="text-sm flex-1">
                  <span className="font-bold text-rasma-dark">
                    {stats.pendingPayments} {stats.pendingPayments === 1 ? "pago pendiente" : "pagos pendientes"}
                  </span>
                  <span className="text-zinc-500 ml-1">— requieren atención</span>
                </p>
                <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
              </div>
            </Link>
          )}

          {/* Today's full schedule */}
          <Card className="overflow-hidden py-0 gap-0">
            <CardHeader className="py-3.5 px-5 border-b bg-muted/30">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Agenda de hoy
                {todayAppts.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                    &middot;
                    {completedToday > 0 && (
                      <span className="font-medium">{completedToday} completada{completedToday > 1 ? "s" : ""}</span>
                    )}
                    {completedToday > 0 && scheduledToday > 0 && ", "}
                    {scheduledToday > 0 && (
                      <span className="font-medium">{scheduledToday} pendiente{scheduledToday > 1 ? "s" : ""}</span>
                    )}
                  </span>
                )}
              </CardTitle>
              <CardAction>
                <Link
                  href="/calendario"
                  className="text-sm font-semibold text-rasma-dark hover:underline flex items-center gap-1"
                >
                  Ver calendario <ArrowRight className="h-4 w-4" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="p-4">
              <TodaySchedule appointments={todaySerialized} userRole={role} />
            </CardContent>
          </Card>
        </div>

        {/* ─── RIGHT: Upcoming + Activity ─── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          {/* Progress this week */}
          {stats.weekAppointments > 0 && (
            <div className="rounded-lg border bg-white px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-rasma-dark">Progreso semanal</p>
                <p className="text-sm text-muted-foreground tabular-nums font-medium">
                  {stats.completedThisWeek} de {stats.weekAppointments}
                </p>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-rasma-dark transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((stats.completedThisWeek / stats.weekAppointments) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Upcoming */}
          <Card className="overflow-hidden py-0 gap-0">
            <CardHeader className="py-3.5 px-5 border-b bg-muted/30">
              <CardTitle className="text-base font-bold">Próximas citas</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <UpcomingAppointments appointments={upcoming} />
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="overflow-hidden py-0 gap-0">
            <CardHeader className="py-3.5 px-5 border-b bg-muted/30">
              <CardTitle className="text-base font-bold">Actividad</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              <ActivityFeed activities={activities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper components ─── */

function StatCard({
  label,
  value,
  icon,
  href,
  alert,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <div className={`rounded-md border bg-white p-4 transition-colors group-hover:bg-zinc-50 ${
        alert ? "border-rasma-dark" : ""
      }`}>
        <div className="flex items-center gap-2 text-zinc-500 mb-1">
          {icon}
          <p className="text-sm truncate">{label}</p>
        </div>
        <p className="text-2xl font-bold text-rasma-dark leading-none tabular-nums">{value}</p>
      </div>
    </Link>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
