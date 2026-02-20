import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { gte, lte, and, eq } from "drizzle-orm";
import { CalendarView } from "@/components/calendar/calendar-view";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function CalendarioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch appointments for a 3-month window (prev month to next month)
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const conditions = [
    gte(appointments.dateTime, startDate),
    lte(appointments.dateTime, endDate),
  ];

  // Therapists only see their own appointments
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

  // Serialize dates as ISO strings for client component
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
  }));

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader
        title="Calendario"
        subtitle="Vista de citas y reuniones"
        action={
          <Link href="/citas/nueva">
            <Button className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cita
            </Button>
          </Link>
        }
      />
      <CalendarView appointments={calendarAppointments} />
    </div>
  );
}
