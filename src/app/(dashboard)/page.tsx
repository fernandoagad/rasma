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
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* ─── Header: greeting + date + actions ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-rasma-dark tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-[13px] text-muted-foreground capitalize">{dateStr}</p>
        </div>
        <QuickActions userRole={role} />
      </div>

      {/* ─── Stats row: inline mini cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatMini
          label={role === "terapeuta" ? "Mis pacientes" : "Pacientes"}
          value={stats.patientCount}
          icon={<Users className="h-3.5 w-3.5 text-rasma-teal" />}
          href="/pacientes"
        />
        <StatMini
          label="Hoy"
          value={stats.todayAppointments}
          suffix={stats.todayAppointments === 1 ? "cita" : "citas"}
          icon={<Calendar className="h-3.5 w-3.5 text-blue-500" />}
          href="/citas"
        />
        {(role === "admin" || role === "recepcionista" || role === "supervisor") ? (
          <StatMini
            label="Pagos pendientes"
            value={stats.pendingPayments}
            icon={<CreditCard className="h-3.5 w-3.5 text-rasma-red" />}
            href="/pagos"
            alert={stats.pendingPayments > 0}
          />
        ) : (
          <StatMini
            label="Completadas"
            value={stats.completedThisWeek}
            suffix="esta semana"
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            href="/citas"
          />
        )}
        {(role === "terapeuta" || role === "supervisor" || role === "admin") ? (
          <StatMini
            label="Notas pendientes"
            value={stats.pendingNotes}
            icon={<FileText className="h-3.5 w-3.5 text-amber-500" />}
            href="/notas"
            alert={stats.pendingNotes > 0}
          />
        ) : (
          <StatMini
            label="Semana"
            value={stats.weekAppointments}
            suffix="citas"
            icon={<CalendarDays className="h-3.5 w-3.5 text-rasma-teal" />}
            href="/calendario"
          />
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
              <div className="flex items-center gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3.5 py-2.5 transition-colors group-hover:border-amber-300">
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <p className="text-xs flex-1">
                  <span className="font-semibold text-amber-900">
                    {stats.pendingNotes} {stats.pendingNotes === 1 ? "nota pendiente" : "notas pendientes"}
                  </span>
                  <span className="text-amber-700 ml-1">— citas completadas sin nota de sesión</span>
                </p>
                <ArrowRight className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              </div>
            </Link>
          )}

          {stats.pendingPayments > 0 && (role === "admin" || role === "recepcionista" || role === "supervisor") && (
            <Link href="/pagos" className="block group">
              <div className="flex items-center gap-3 rounded-xl border border-red-200/80 bg-red-50/60 px-3.5 py-2.5 transition-colors group-hover:border-red-300">
                <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <CreditCard className="h-3.5 w-3.5 text-rasma-red" />
                </div>
                <p className="text-xs flex-1">
                  <span className="font-semibold text-red-900">
                    {stats.pendingPayments} {stats.pendingPayments === 1 ? "pago pendiente" : "pagos pendientes"}
                  </span>
                  <span className="text-red-700 ml-1">— requieren atención</span>
                </p>
                <ArrowRight className="h-3.5 w-3.5 text-red-400 shrink-0" />
              </div>
            </Link>
          )}

          {/* Today's full schedule */}
          <Card className="overflow-hidden py-0 gap-0">
            <CardHeader className="py-2.5 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Agenda de hoy
                {todayAppts.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
                    &middot;
                    {completedToday > 0 && (
                      <span className="text-emerald-600">{completedToday} completada{completedToday > 1 ? "s" : ""}</span>
                    )}
                    {completedToday > 0 && scheduledToday > 0 && ", "}
                    {scheduledToday > 0 && (
                      <span>{scheduledToday} pendiente{scheduledToday > 1 ? "s" : ""}</span>
                    )}
                  </span>
                )}
              </CardTitle>
              <CardAction>
                <Link
                  href="/calendario"
                  className="text-[11px] font-medium text-rasma-teal hover:underline flex items-center gap-0.5"
                >
                  Calendario <ArrowRight className="h-3 w-3" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="p-3">
              <TodaySchedule appointments={todaySerialized} userRole={role} />
            </CardContent>
          </Card>
        </div>

        {/* ─── RIGHT: Upcoming + Activity ─── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          {/* Progress this week */}
          {stats.weekAppointments > 0 && (
            <div className="rounded-xl border bg-background px-3.5 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-foreground/80">Progreso semanal</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {stats.completedThisWeek}/{stats.weekAppointments}
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-rasma-teal transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((stats.completedThisWeek / stats.weekAppointments) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Upcoming */}
          <Card className="overflow-hidden py-0 gap-0">
            <CardHeader className="py-2.5 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm font-semibold">Próximas citas</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <UpcomingAppointments appointments={upcoming} />
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="overflow-hidden py-0 gap-0">
            <CardHeader className="py-2.5 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm font-semibold">Actividad</CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-2">
              <ActivityFeed activities={activities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper components ─── */

function StatMini({
  label,
  value,
  suffix,
  icon,
  href,
  alert,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 h-[52px] transition-all group-hover:shadow-sm group-hover:border-border ${
        alert ? "border-amber-200 bg-amber-50/40" : "bg-background"
      }`}>
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-rasma-dark leading-none tabular-nums">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5 leading-none">{label}</p>
        </div>
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
