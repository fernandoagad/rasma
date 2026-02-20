"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Clock,
  Video,
  MapPin,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  FileText,
  CreditCard,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateAppointmentStatus } from "@/actions/appointments";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  dateTime: Date;
  durationMinutes: number;
  status: string;
  sessionType: string;
  modality: string;
  meetingLink: string | null;
  location: string | null;
  notes: string | null;
  patient: { id: string; firstName: string; lastName: string };
  therapist: { id: string; name: string };
}

interface Props {
  appointments: Appointment[];
  totalPages: number;
  currentPage: number;
  filterStatus?: string;
}

function groupByDate(appointments: Appointment[]): Map<string, Appointment[]> {
  const groups = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    const dt = new Date(appt.dateTime);
    const key = dt.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(appt);
  }
  return groups;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  );
}

function getRelativeLabel(date: Date): string | null {
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Manana";
  return null;
}

export function AppointmentsList({ appointments, totalPages, currentPage, filterStatus }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const grouped = groupByDate(appointments);

  async function handleStatusChange(id: string, status: string) {
    setLoadingId(id);
    await updateAppointmentStatus(id, status);
    setLoadingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateLabel, dayAppts]) => {
        const firstDate = new Date(dayAppts[0].dateTime);
        const relativeLabel = getRelativeLabel(firstDate);
        const dayIsToday = isToday(firstDate);

        return (
          <div key={dateLabel}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              {dayIsToday && (
                <span className="flex h-2 w-2 rounded-full bg-rasma-teal animate-pulse" />
              )}
              <h3 className={cn(
                "text-sm font-semibold capitalize",
                dayIsToday ? "text-rasma-teal" : "text-muted-foreground"
              )}>
                {relativeLabel ? `${relativeLabel} — ` : ""}{dateLabel}
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {dayAppts.length} {dayAppts.length === 1 ? "cita" : "citas"}
              </span>
            </div>

            {/* Appointment cards */}
            <div className="space-y-2">
              {dayAppts.map((appt) => {
                const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`;
                const dt = new Date(appt.dateTime);
                const endTime = new Date(dt.getTime() + appt.durationMinutes * 60000);
                const isProgramada = appt.status === "programada";
                const isLoading = loadingId === appt.id;

                return (
                  <Card key={appt.id} className={cn(
                    "py-0 gap-0 transition-all hover:shadow-md overflow-hidden",
                    isLoading && "opacity-60 pointer-events-none",
                    appt.status === "cancelada" && "opacity-60"
                  )}>
                    <CardContent className="p-0">
                      <div className="flex items-stretch">
                        {/* Left time strip */}
                        <div className={cn(
                          "flex flex-col items-center justify-center w-20 shrink-0 border-r py-4",
                          appt.status === "completada" && "bg-green-50",
                          appt.status === "programada" && "bg-blue-50",
                          appt.status === "cancelada" && "bg-red-50",
                          appt.status === "no_asistio" && "bg-yellow-50",
                        )}>
                          <p className="text-lg font-bold text-rasma-dark leading-none">
                            {dt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {endTime.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {appt.durationMinutes} min
                          </p>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 flex items-center justify-between px-4 py-3.5 min-w-0 gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarInitials name={patientName} size="sm" />
                            <div className="min-w-0">
                              <Link
                                href={`/citas/${appt.id}`}
                                className="text-sm font-semibold hover:underline truncate block"
                              >
                                {patientName}
                              </Link>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground capitalize">{appt.sessionType}</span>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">{appt.therapist.name}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Modality icon + quick action */}
                            {appt.modality === "online" && appt.meetingLink ? (
                              <a
                                href={appt.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rasma-teal/10 text-rasma-teal text-xs font-medium hover:bg-rasma-teal/20 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Video className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Meet</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : appt.modality === "online" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-xs text-muted-foreground">
                                <Video className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Online</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Presencial</span>
                              </span>
                            )}

                            <StatusBadge type="appointment" status={appt.status} />

                            {/* Quick actions menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <Link href={`/citas/${appt.id}`} className="cursor-pointer">
                                    <Eye className="mr-2 h-4 w-4" /> Ver detalle
                                  </Link>
                                </DropdownMenuItem>

                                {appt.meetingLink && (
                                  <DropdownMenuItem asChild>
                                    <a href={appt.meetingLink} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                                      <Video className="mr-2 h-4 w-4" /> Abrir Meet
                                    </a>
                                  </DropdownMenuItem>
                                )}

                                {isProgramada && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(appt.id, "completada")}
                                      className="cursor-pointer text-green-700 focus:text-green-700"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" /> Marcar completada
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(appt.id, "no_asistio")}
                                      className="cursor-pointer text-yellow-700 focus:text-yellow-700"
                                    >
                                      <AlertTriangle className="mr-2 h-4 w-4" /> No asistio
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(appt.id, "cancelada")}
                                      className="cursor-pointer text-red-600 focus:text-red-600"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" /> Cancelar cita
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {appt.status === "completada" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                      <Link href={`/notas?appointmentId=${appt.id}`} className="cursor-pointer">
                                        <FileText className="mr-2 h-4 w-4" /> Agregar nota
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/pagos?appointmentId=${appt.id}`} className="cursor-pointer">
                                        <CreditCard className="mr-2 h-4 w-4" /> Registrar pago
                                      </Link>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/citas?status=${filterStatus || "all"}&page=${p}`}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition",
                p === currentPage
                  ? "bg-rasma-dark text-rasma-lime"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
