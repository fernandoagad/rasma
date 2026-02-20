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
  completada: { icon: Check, color: "text-emerald-500 bg-emerald-50" },
  cancelada: { icon: X, color: "text-red-400 bg-red-50" },
  no_asistio: { icon: X, color: "text-amber-500 bg-amber-50" },
};

export function TodaySchedule({ appointments, userRole }: TodayScheduleProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex items-center gap-3 py-6 justify-center">
        <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
          <Clock className="h-4.5 w-4.5 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/60">Sin citas hoy</p>
          <Link href="/citas/nueva" className="text-[11px] text-rasma-teal hover:underline">
            Agendar una cita
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[27px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-1">
        {appointments.map((appt, idx) => {
          const patientName = `${appt.patientFirstName} ${appt.patientLastName}`;
          const timing = getTiming(appt.dateTime, appt.durationMinutes);
          const isPast = timing === "past";
          const isCurrent = timing === "current";
          const done = statusIcon[appt.status];

          return (
            <Link
              key={appt.id}
              href={`/citas/${appt.id}`}
              className={`group relative flex items-start gap-3 rounded-lg px-2 py-2.5 transition-all
                ${isCurrent
                  ? "bg-rasma-teal/[0.06] hover:bg-rasma-teal/[0.1]"
                  : isPast
                    ? "opacity-55 hover:opacity-80"
                    : "hover:bg-muted/60"
                }`}
            >
              {/* Timeline dot */}
              <div className="relative z-10 mt-0.5 shrink-0">
                {isCurrent ? (
                  <span className="flex h-[14px] w-[14px] items-center justify-center">
                    <span className="absolute h-[14px] w-[14px] animate-ping rounded-full bg-rasma-teal/40" />
                    <span className="relative h-2.5 w-2.5 rounded-full bg-rasma-teal ring-2 ring-background" />
                  </span>
                ) : done ? (
                  <span className={`flex h-[14px] w-[14px] items-center justify-center rounded-full ${done.color}`}>
                    <done.icon className="h-2.5 w-2.5" />
                  </span>
                ) : (
                  <span className="flex h-[14px] w-[14px] items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-border ring-2 ring-background" />
                  </span>
                )}
              </div>

              {/* Time */}
              <div className="w-11 shrink-0 pt-px">
                <p className={`text-xs font-semibold tabular-nums ${isCurrent ? "text-rasma-teal" : "text-foreground/70"}`}>
                  {formatTime(appt.dateTime)}
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex items-center gap-2.5">
                <AvatarInitials name={patientName} size="sm" className={`${isPast ? "opacity-60" : ""}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium truncate ${isCurrent ? "text-rasma-dark" : ""}`}>
                    {patientName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    <span className="capitalize">{appt.sessionType}</span>
                    {" · "}
                    {appt.durationMinutes}min
                    {userRole !== "terapeuta" && ` · ${appt.therapistName}`}
                  </p>
                </div>
              </div>

              {/* Right side: modality + action */}
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                {appt.modality === "online" && appt.meetingLink && appt.status === "programada" ? (
                  <Button
                    size="sm"
                    className={`h-6 px-2 text-[11px] gap-1 rounded-md ${
                      isCurrent
                        ? "bg-rasma-teal text-white hover:bg-rasma-teal/90 shadow-sm"
                        : "bg-rasma-teal/10 text-rasma-teal hover:bg-rasma-teal/20"
                    }`}
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a href={appt.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Video className="h-3 w-3" />
                      Meet
                    </a>
                  </Button>
                ) : (
                  <span className={`flex items-center gap-1 text-[11px] ${
                    appt.modality === "online" ? "text-rasma-teal" : "text-muted-foreground"
                  }`}>
                    {appt.modality === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                  </span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
