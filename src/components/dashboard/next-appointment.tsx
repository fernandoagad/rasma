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
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function getEndTime(iso: string, duration: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + duration);
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
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
    <div className={`rounded-2xl p-4 sm:p-5 ${
      isNow
        ? "bg-gradient-to-br from-rasma-teal/10 via-rasma-teal/5 to-transparent border border-rasma-teal/20"
        : "bg-gradient-to-br from-rasma-dark/[0.04] via-transparent to-transparent border border-border"
    }`}>
      {/* Top: countdown badge */}
      <div className="flex items-center justify-between mb-3">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isNow
            ? "bg-rasma-teal text-white"
            : "bg-rasma-dark/10 text-rasma-dark"
        }`}>
          {isNow && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
          )}
          <Clock className="h-3 w-3" />
          {countdown}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatTime(appointment.dateTime)} – {getEndTime(appointment.dateTime, appointment.durationMinutes)}
        </span>
      </div>

      {/* Main: patient info */}
      <div className="flex items-center gap-3 mb-3">
        <AvatarInitials name={patientName} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-lg font-bold text-rasma-dark truncate">{patientName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span className="capitalize">{appointment.sessionType}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>{appointment.durationMinutes} min</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="flex items-center gap-0.5">
              {isOnline ? <Video className="h-3 w-3 text-rasma-teal" /> : <MapPin className="h-3 w-3" />}
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
      <div className="flex items-center gap-2">
        {isOnline && appointment.meetingLink ? (
          <Button
            className="bg-rasma-teal text-white hover:bg-rasma-teal/90 shadow-sm gap-1.5 h-8 px-4 text-xs rounded-lg flex-1 sm:flex-none"
            asChild
          >
            <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer">
              <Video className="h-3.5 w-3.5" />
              Unirse a Meet
            </a>
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs gap-1 rounded-lg text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/citas/${appointment.id}`}>
            Ver detalles
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
