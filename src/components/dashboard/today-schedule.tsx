"use client";

import Link from "next/link";
import { Video, MapPin, Clock, Check, X, CircleDot, ChevronRight } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";

type TodayAppointment = {
  id: string;
  dateTime: string;
  durationMinutes: number;
  status: string;
  sessionType: string;
  modality: string;
  meetingLink: string | null;
  patientFirstName: string;
  patientLastName: string;
  therapistName: string;
};

interface TodayScheduleProps {
  appointments: TodayAppointment[];
  userRole: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function getTiming(iso: string, duration: number): "past" | "current" | "upcoming" {
  const now = new Date();
  const start = new Date(iso);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + duration);
  if (now >= start && now <= end) return "current";
  if (now < start) return "upcoming";
  return "past";
}

const statusIcon: Record<string, { icon: typeof Check; color: string }> = {
  completada: { icon: Check, color: "text-rasma-dark bg-zinc-100" },
  cancelada: { icon: X, color: "text-zinc-500 bg-zinc-100" },
  no_asistio: { icon: X, color: "text-zinc-500 bg-zinc-100" },
};

export function TodaySchedule({ appointments, userRole }: TodayScheduleProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex items-center gap-4 py-8 justify-center">
        <div className="h-12 w-12 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
          <Clock className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-base font-medium text-foreground/60">Sin citas hoy</p>
          <Link href="/citas/nueva" className="text-sm text-rasma-teal hover:underline font-medium">
            Agendar una cita
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[31px] top-3 bottom-3 w-px bg-border" />

      <div className="space-y-1.5">
        {appointments.map((appt) => {
          const patientName = `${appt.patientFirstName} ${appt.patientLastName}`;
          const timing = getTiming(appt.dateTime, appt.durationMinutes);
          const isPast = timing === "past";
          const isCurrent = timing === "current";
          const done = statusIcon[appt.status];

          return (
            <Link
              key={appt.id}
              href={`/citas/${appt.id}`}
              className={`group relative flex items-start gap-3.5 rounded-xl px-3 py-3 transition-all
                ${isCurrent
                  ? "bg-zinc-50 hover:bg-zinc-100/80"
                  : isPast
                    ? "opacity-50 hover:opacity-80"
                    : "hover:bg-muted/60"
                }`}
            >
              {/* Timeline dot */}
              <div className="relative z-10 mt-1 shrink-0">
                {isCurrent ? (
                  <span className="flex h-4 w-4 items-center justify-center">
                    <span className="absolute h-4 w-4 animate-ping rounded-full bg-rasma-dark/40" />
                    <span className="relative h-3 w-3 rounded-full bg-rasma-dark ring-2 ring-background" />
                  </span>
                ) : done ? (
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full ${done.color}`}>
                    <done.icon className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-border ring-2 ring-background" />
                  </span>
                )}
              </div>

              {/* Time */}
              <div className="w-14 shrink-0 pt-0.5">
                <p className={`text-sm font-bold tabular-nums ${isCurrent ? "text-rasma-dark" : "text-foreground/70"}`}>
                  {formatTime(appt.dateTime)}
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <AvatarInitials name={patientName} size="sm" className={`${isPast ? "opacity-60" : ""}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isCurrent ? "text-rasma-dark" : ""}`}>
                    {patientName}
                  </p>
                  <p className="text-[13px] text-muted-foreground truncate">
                    <span className="capitalize">{appt.sessionType}</span>
                    {" · "}
                    {appt.durationMinutes} min
                    {userRole !== "terapeuta" && ` · ${appt.therapistName}`}
                  </p>
                </div>
              </div>

              {/* Right side: modality + action */}
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                {appt.modality === "online" && appt.meetingLink && appt.status === "programada" ? (
                  <Button
                    size="sm"
                    className={`h-8 px-3 text-xs gap-1.5 rounded-lg font-semibold ${
                      isCurrent
                        ? "bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 shadow-sm"
                        : "bg-zinc-100 text-rasma-dark hover:bg-zinc-200"
                    }`}
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a href={appt.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Video className="h-3.5 w-3.5" />
                      Meet
                    </a>
                  </Button>
                ) : (
                  <span className={`flex items-center gap-1.5 text-sm ${
                    appt.modality === "online" ? "text-rasma-dark" : "text-muted-foreground"
                  }`}>
                    {appt.modality === "online" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
