"use client";

import Link from "next/link";
import { Video, MapPin, Clock, ArrowRight } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type NextAppt = {
  id: string;
  dateTime: string;
  durationMinutes: number;
  sessionType: string;
  modality: string;
  meetingLink: string | null;
  patientFirstName: string;
  patientLastName: string;
  therapistName: string;
  status: string;
};

interface NextAppointmentProps {
  appointment: NextAppt | null;
  userRole: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" });
}

function getEndTime(iso: string, duration: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + duration);
  return d.toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" });
}

function useCountdown(targetIso: string) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function calc() {
      const now = Date.now();
      const target = new Date(targetIso).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setLabel("Ahora");
        return;
      }

      const mins = Math.floor(diff / 60000);
      if (mins < 60) {
        setLabel(`En ${mins} min`);
      } else {
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        setLabel(remainMins > 0 ? `En ${hrs}h ${remainMins}m` : `En ${hrs}h`);
      }
    }

    calc();
    const interval = setInterval(calc, 30000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return label;
}

export function NextAppointment({ appointment, userRole }: NextAppointmentProps) {
  if (!appointment) return null;

  const patientName = `${appointment.patientFirstName} ${appointment.patientLastName}`;
  const isNow = new Date(appointment.dateTime).getTime() <= Date.now();
  const countdown = useCountdown(appointment.dateTime);
  const isOnline = appointment.modality === "online";

  return (
    <div className={`rounded-2xl p-5 sm:p-6 relative overflow-hidden ${
      isNow
        ? "bg-white border-2 border-rasma-dark/30"
        : "bg-white border border-border"
    }`}>
      {isNow && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rasma-dark" />}
      {/* Top: countdown badge */}
      <div className="flex items-center justify-between mb-4">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-bold ${
          isNow
            ? "bg-rasma-dark text-rasma-lime"
            : "bg-rasma-dark/10 text-rasma-dark"
        }`}>
          {isNow && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rasma-lime opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rasma-lime" />
            </span>
          )}
          <Clock className="h-4 w-4" />
          {countdown}
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          {formatTime(appointment.dateTime)} – {getEndTime(appointment.dateTime, appointment.durationMinutes)}
        </span>
      </div>

      {/* Main: patient info */}
      <div className="flex items-center gap-4 mb-4">
        <AvatarInitials name={patientName} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-lg sm:text-xl font-bold text-rasma-dark truncate">{patientName}</p>
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground mt-1">
            <span className="capitalize font-medium">{appointment.sessionType}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>{appointment.durationMinutes} min</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="flex items-center gap-1">
              {isOnline ? <Video className="h-4 w-4 text-rasma-dark" /> : <MapPin className="h-4 w-4" />}
              {isOnline ? "Online" : "Presencial"}
            </span>
            {userRole !== "terapeuta" && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span className="truncate">{appointment.therapistName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isOnline && appointment.meetingLink ? (
          <Button
            className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 gap-2 h-10 px-5 text-sm rounded-xl flex-1 sm:flex-none font-semibold"
            asChild
          >
            <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer">
              <Video className="h-4 w-4" />
              Unirse a Meet
            </a>
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="h-10 px-4 text-sm gap-1.5 rounded-xl text-muted-foreground hover:text-foreground font-medium"
          asChild
        >
          <Link href={`/citas/${appointment.id}`}>
            Ver detalles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
