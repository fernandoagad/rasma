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
  Plus,
  ClipboardList,
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

  if (role === "paciente") redirect("/mis-citas");
  if (role === "invitado") redirect("/pendiente");

  const firstName = session.user.name?.split(" ")[0] || "usuario";

  const [stats, activities, upcoming, todayAppts] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(8),
    getUpcomingAppointments(5),
    getTodayAppointments(),
  ]);

  const todaySerialized = todayAppts.map((a) => ({
    ...a,
    dateTime: a.dateTime instanceof Date ? a.dateTime.toISOString() : String(a.dateTime),
  }));

  const now = new Date();
  const nextAppt = todaySerialized.find((a) => {
    if (a.status !== "programada") return false;
    const start = new Date(a.dateTime);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + a.durationMinutes);
    return now <= end;
  }) ?? null;

  const today = new Date();
  const dateStr = today.toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const completedToday = todayAppts.filter((a) => a.status === "completada").length;
  const scheduledToday = todayAppts.filter((a) => a.status === "programada").length;

  const isTherapist = role === "terapeuta";
  const canSeePayments = role === "admin" || role === "recepcionista" || role === "supervisor";
  const canSeeNotes = role === "terapeuta" || role === "supervisor" || role === "admin";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ═══ HERO HEADER ═══ */}
      <div className="relative rounded-2xl bg-rasma-dark px-6 py-6 sm:px-8 sm:py-7 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,197,250,0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(224,255,130,0.06),transparent_50%)]" />

        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs text-white/40 font-medium uppercase tracking-[0.2em] mb-1">{dateStr}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {getGreeting()}, <span className="text-rasma-lime">{firstName}</span>
            </h1>
          </div>

          {/* Inline stat pills */}
          <div className="flex items-center gap-3 flex-wrap">
            {todayAppts.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                <Calendar className="h-3.5 w-3.5 text-rasma-lime" />
                <span className="text-xs text-white/80 font-medium">
                  {todayAppts.length} cita{todayAppts.length !== 1 ? "s" : ""} hoy
                </span>
              </div>
            )}
            {completedToday > 0 && (
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-white/80 font-medium">
                  {completedToday} completada{completedToday !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <QuickActions userRole={role} />

      {/* ═══ STATS ROW ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label={isTherapist ? "Mis pacientes" : "Pacientes"}
          value={stats.patientCount}
          icon={<Users className="h-4 w-4" />}
          href="/pacientes"
        />
        <StatCard
          label="Citas hoy"
          value={stats.todayAppointments}
          icon={<Calendar className="h-4 w-4" />}
          href="/citas"
          highlight={stats.todayAppointments > 0}
        />
        {canSeePayments ? (
          <StatCard
            label="Pagos pendientes"
            value={stats.pendingPayments}
            icon={<CreditCard className="h-4 w-4" />}
            href="/pagos"
            alert={stats.pendingPayments > 0}
          />
        ) : (
          <StatCard
            label="Completadas semana"
            value={stats.completedThisWeek}
            icon={<CheckCircle2 className="h-4 w-4" />}
            href="/citas"
          />
        )}
        {canSeeNotes ? (
          <StatCard
            label="Notas pendientes"
            value={stats.pendingNotes}
            icon={<FileText className="h-4 w-4" />}
            href="/notas"
            alert={stats.pendingNotes > 0}
          />
        ) : (
          <StatCard
            label="Citas semana"
            value={stats.weekAppointments}
            icon={<CalendarDays className="h-4 w-4" />}
            href="/calendario"
          />
        )}
      </div>

      {/* ═══ MAIN GRID ═══ */}
      <div className="grid gap-5 lg:grid-cols-12">

        {/* ─── LEFT COLUMN ─── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">

          {/* Next Appointment Hero */}
          <NextAppointment appointment={nextAppt} userRole={role} />

          {/* Alert: pending notes */}
          {stats.pendingNotes > 0 && canSeeNotes && (
            <AlertBanner
              href="/notas"
              icon={<FileText className="h-4 w-4" />}
              count={stats.pendingNotes}
              singular="nota pendiente"
              plural="notas pendientes"
              detail="citas completadas sin nota de sesion"
            />
          )}

          {/* Alert: pending payments */}
          {stats.pendingPayments > 0 && canSeePayments && (
            <AlertBanner
              href="/pagos"
              icon={<CreditCard className="h-4 w-4" />}
              count={stats.pendingPayments}
              singular="pago pendiente"
              plural="pagos pendientes"
              detail="requieren atencion"
            />
          )}

          {/* Today's schedule */}
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

        {/* ─── RIGHT COLUMN ─── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">

          {/* Weekly progress */}
          {stats.weekAppointments > 0 && (
            <div className="rounded-2xl border bg-white px-5 py-4">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-sm font-bold text-rasma-dark">Progreso semanal</p>
                <p className="text-sm text-muted-foreground tabular-nums font-medium">
                  {stats.completedThisWeek}/{stats.weekAppointments}
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
              <p className="text-[10px] text-muted-foreground mt-2">
                {Math.round((stats.completedThisWeek / stats.weekAppointments) * 100)}% completado esta semana
              </p>
            </div>
          )}

          {/* Upcoming appointments */}
          <Card className="overflow-hidden py-0 gap-0">
            <CardHeader className="py-3.5 px-5 border-b bg-muted/30">
              <CardTitle className="text-base font-bold">Proximas citas</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <UpcomingAppointments appointments={upcoming} />
            </CardContent>
          </Card>

          {/* Activity feed */}
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

/* ═══════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  icon,
  href,
  alert,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  alert?: boolean;
  highlight?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <div
        className={`rounded-2xl border bg-white p-4 transition-all group-hover:shadow-md group-hover:-translate-y-0.5 ${
          alert
            ? "border-rasma-red/30 bg-red-50/30"
            : highlight
            ? "border-rasma-dark/20"
            : ""
        }`}
      >
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
            alert ? "bg-red-100 text-rasma-red" : "bg-zinc-100 text-rasma-dark"
          }`}>
            {icon}
          </div>
          <p className="text-xs font-medium truncate">{label}</p>
        </div>
        <p className={`text-3xl font-extrabold leading-none tabular-nums ${
          alert ? "text-rasma-red" : "text-rasma-dark"
        }`}>
          {value}
        </p>
      </div>
    </Link>
  );
}

function AlertBanner({
  href,
  icon,
  count,
  singular,
  plural,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  count: number;
  singular: string;
  plural: string;
  detail: string;
}) {
  return (
    <Link href={href} className="block group">
      <div className="flex items-center gap-3 rounded-2xl border border-rasma-dark/10 bg-rasma-dark/[0.03] px-5 py-3.5 transition-all group-hover:bg-rasma-dark/[0.06] group-hover:border-rasma-dark/20">
        <div className="h-8 w-8 rounded-lg bg-rasma-dark text-rasma-lime flex items-center justify-center shrink-0">
          {icon}
        </div>
        <p className="text-sm flex-1 min-w-0">
          <span className="font-bold text-rasma-dark">
            {count} {count === 1 ? singular : plural}
          </span>
          <span className="text-muted-foreground ml-1.5">— {detail}</span>
        </p>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos dias";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
