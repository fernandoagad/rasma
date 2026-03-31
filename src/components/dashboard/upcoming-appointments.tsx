import Link from "next/link";
import { Video, MapPin, ArrowRight } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";

type AppointmentRow = {
  id: string;
  dateTime: Date | string;
  durationMinutes: number;
  sessionType: string;
  modality: string;
  meetingLink?: string | null;
  patientFirstName: string;
  patientLastName: string;
  therapistName: string;
};

interface UpcomingAppointmentsProps {
  appointments: AppointmentRow[];
}

function formatDate(raw: Date | string): { day: string; time: string; weekday: string } {
  const d = typeof raw === "string" ? new Date(raw) : raw;
  return {
    day: d.toLocaleDateString("es-CL", { day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    weekday: d.toLocaleDateString("es-CL", { weekday: "short" }),
  };
}

export function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  if (appointments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No hay citas proximas.
      </p>
    );
  }

  return (
    <div>
      {appointments.map((appt) => {
        const patientName = `${appt.patientFirstName} ${appt.patientLastName}`;
        const { day, time, weekday } = formatDate(appt.dateTime);

        return (
          <Link
            key={appt.id}
            href={`/citas/${appt.id}`}
            className="flex items-center gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors"
          >
            <div className="w-10 text-center shrink-0">
              <p className="text-xs font-bold text-muted-foreground uppercase">{weekday}</p>
              <p className="text-sm font-bold text-rasma-dark">{day.split(" ")[0]}</p>
            </div>
            <div className="h-7 w-px bg-border shrink-0" />
            <AvatarInitials name={patientName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{patientName}</p>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground font-medium shrink-0">{time}</span>
            {appt.modality === "online" ? (
              <Video className="h-4 w-4 text-rasma-dark shrink-0" />
            ) : (
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </Link>
        );
      })}

      <Link
        href="/citas"
        className="flex items-center justify-center gap-1.5 pt-3 mt-2 border-t text-sm font-semibold text-rasma-teal hover:underline hover:text-rasma-teal"
      >
        Ver todas
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
