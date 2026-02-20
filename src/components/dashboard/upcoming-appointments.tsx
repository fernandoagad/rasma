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
      <p className="text-xs text-muted-foreground py-4 text-center">
        No hay citas próximas.
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
            className="flex items-center gap-2.5 py-2 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
          >
            <div className="w-8 text-center shrink-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase">{weekday}</p>
              <p className="text-xs font-bold text-foreground/80 -mt-0.5">{day.split(" ")[0]}</p>
            </div>
            <div className="h-6 w-px bg-border shrink-0" />
            <AvatarInitials name={patientName} size="sm" className="h-6 w-6 text-[10px]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{patientName}</p>
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">{time}</span>
            {appt.modality === "online" ? (
              <Video className="h-3 w-3 text-rasma-teal shrink-0" />
            ) : (
              <MapPin className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
          </Link>
        );
      })}

      <Link
        href="/citas"
        className="flex items-center justify-center gap-1 pt-2 mt-1 border-t text-[11px] font-medium text-rasma-teal hover:underline"
      >
        Ver todas
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
