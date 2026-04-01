import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { gte, lte, and, eq } from "drizzle-orm";
import { CalendarView } from "@/components/calendar/calendar-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays } from "lucide-react";

export default async function CalendarioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const conditions = [
    gte(appointments.dateTime, startDate),
    lte(appointments.dateTime, endDate),
  ];

  if (session.user.role === "terapeuta") {
    conditions.push(eq(appointments.therapistId, session.user.id));
  }

  const data = await db.query.appointments.findMany({
    where: and(...conditions),
    with: {
      patient: { columns: { firstName: true, lastName: true } },
      therapist: { columns: { name: true } },
    },
    orderBy: (a, { asc }) => [asc(a.dateTime)],
  });

  const calendarAppointments = data.map((a) => ({
    id: a.id,
    patientName: `${a.patient.firstName} ${a.patient.lastName}`,
    therapistName: a.therapist.name,
    dateTime: a.dateTime.toISOString(),
    durationMinutes: a.durationMinutes,
    status: a.status,
    sessionType: a.sessionType,
    modality: a.modality,
    meetingLink: a.meetingLink,
    recurringGroupId: a.recurringGroupId,
  }));

  const todayCount = data.filter((a) => {
    const d = new Date(a.dateTime);
    return d.toDateString() === now.toDateString() && a.status === "programada";
  }).length;

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rasma-dark text-rasma-lime flex items-center justify-center">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-rasma-dark tracking-tight">Calendario</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Vista de citas y reuniones
              {todayCount > 0 && (
                <> · <span className="font-medium text-rasma-dark">{todayCount} hoy</span></>
              )}
            </p>
          </div>
        </div>
        <Link href="/citas/nueva">
          <Button className="h-11 px-5 text-base font-semibold rounded-xl gap-2 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
            <Plus className="h-5 w-5" />
            Nueva Cita
          </Button>
        </Link>
      </div>
      <CalendarView appointments={calendarAppointments} />
    </div>
  );
}
