"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Video, MapPin, Plus, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CalendarAppointment {
  id: string;
  patientName: string;
  therapistName: string;
  dateTime: string;
  durationMinutes: number;
  status: string;
  sessionType: string;
  modality: string;
  meetingLink: string | null;
}

interface CalendarViewProps {
  appointments: CalendarAppointment[];
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 - 22:00
const DAY_NAMES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const DAY_NAMES_FULL = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function getMonthDates(date: Date): Date[][] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    currentWeek.push(new Date(year, month, -i));
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    let nextDay = 1;
    while (currentWeek.length < 7) {
      currentWeek.push(new Date(year, month + 1, nextDay++));
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const statusColors: Record<string, string> = {
  programada: "bg-blue-50 border-blue-200 text-blue-700",
  completada: "bg-emerald-50 border-emerald-200 text-emerald-700",
  cancelada: "bg-red-50 border-red-200 text-red-600",
  no_asistio: "bg-amber-50 border-amber-200 text-amber-700",
};

const statusDot: Record<string, string> = {
  programada: "bg-blue-500",
  completada: "bg-emerald-500",
  cancelada: "bg-red-500",
  no_asistio: "bg-amber-500",
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLink(date: Date, hour?: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = hour !== undefined ? String(hour).padStart(2, "0") : "09";
  return `/citas/nueva?date=${y}-${m}-${d}T${h}:00`;
}

function getSessionIcon(sessionType: string) {
  if (sessionType === "individual" || sessionType === "evaluacion") return User;
  return Users;
}

export function CalendarView({ appointments }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");

  const today = new Date();
  const currentHour = today.getHours();

  const parsedAppointments = useMemo(
    () => appointments.map((a) => ({ ...a, date: new Date(a.dateTime) })),
    [appointments]
  );

  const goBack = () => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const goForward = () => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const goToDay = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const monthWeeks = useMemo(() => getMonthDates(currentDate), [currentDate]);

  const weekRange = weekDates.length > 0
    ? `${weekDates[0].toLocaleDateString("es-CL", { day: "numeric", month: "short" })} \u2014 ${weekDates[6].toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  const monthLabel = currentDate.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  const dayDow = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
  const dayLabel = `${DAY_NAMES_FULL[dayDow]}, ${currentDate.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}`;

  const dayAppointments = useMemo(
    () => parsedAppointments.filter((a) => isSameDay(a.date, currentDate)).sort((a, b) => a.date.getTime() - b.date.getTime()),
    [parsedAppointments, currentDate]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-10 bg-muted/40 -mx-1 px-1 py-1">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goBack} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={goForward} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold ml-2 capitalize">
            {view === "day" ? dayLabel : view === "week" ? weekRange : monthLabel}
          </h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                view === v ? "bg-rasma-dark text-rasma-lime" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {/* Day View */}
      {view === "day" && (
        <Card>
          <CardContent className="p-0">
            {HOURS.map((hour) => {
              const hourAppts = dayAppointments.filter((a) => a.date.getHours() === hour);
              const isCurrentHour = isSameDay(currentDate, today) && hour === currentHour;

              return (
                <div
                  key={hour}
                  className={cn(
                    "flex min-h-[56px] border-b relative group",
                    isCurrentHour && "bg-rasma-teal/5"
                  )}
                >
                  {/* Current hour indicator */}
                  {isCurrentHour && (
                    <div
                      className="absolute left-[70px] right-0 h-0.5 bg-rasma-red z-10"
                      style={{ top: `${(today.getMinutes() / 60) * 100}%` }}
                    >
                      <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-rasma-red" />
                    </div>
                  )}

                  <div className="w-[70px] shrink-0 p-2 text-right text-xs text-muted-foreground border-r font-mono">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  <div className="flex-1 p-1.5 space-y-1">
                    {hourAppts.map((appt) => {
                      const SessionIcon = getSessionIcon(appt.sessionType);
                      return (
                        <Link
                          key={appt.id}
                          href={`/citas/${appt.id}`}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 border transition-all hover:shadow-sm",
                            statusColors[appt.status] || "bg-gray-50 border-gray-200"
                          )}
                        >
                          <div className={cn("h-2 w-2 rounded-full shrink-0", statusDot[appt.status] || "bg-gray-400")} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">{formatTime(appt.date)}</span>
                              <span className="text-xs">·</span>
                              <span className="text-xs font-medium truncate">{appt.patientName}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <SessionIcon className="h-3 w-3 opacity-60" />
                              <span className="text-[10px] opacity-70">{appt.therapistName}</span>
                              <span className="text-[10px] opacity-50">· {appt.durationMinutes} min</span>
                            </div>
                          </div>
                          {appt.modality === "online" && (
                            <Video className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          )}
                          {appt.modality === "presencial" && (
                            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          )}
                        </Link>
                      );
                    })}
                    <Link
                      href={formatDateLink(currentDate, hour)}
                      className={cn(
                        "flex items-center justify-center min-h-[32px] opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-muted/50",
                        hourAppts.length === 0 && "h-full"
                      )}
                    >
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {view === "week" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day headers */}
              <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b">
                <div className="p-2" />
                {weekDates.map((date, i) => {
                  const isToday = isSameDay(date, today);
                  const dayApptCount = parsedAppointments.filter((a) => isSameDay(a.date, date)).length;
                  return (
                    <button
                      key={i}
                      onClick={() => goToDay(date)}
                      className={cn(
                        "p-2 text-center border-l transition-colors hover:bg-muted/50",
                        isToday && "bg-rasma-teal/5"
                      )}
                    >
                      <p className="text-[10px] text-muted-foreground uppercase">{DAY_NAMES[i]}</p>
                      <p className={cn(
                        "text-sm font-semibold mt-0.5",
                        isToday && "text-rasma-teal"
                      )}>
                        {date.getDate()}
                      </p>
                      {dayApptCount > 0 && (
                        <p className="text-[10px] text-muted-foreground">{dayApptCount} cita{dayApptCount > 1 ? "s" : ""}</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Time slots */}
              {HOURS.map((hour) => {
                const isCurrentHour = isSameDay(weekDates.find((d) => isSameDay(d, today)) || new Date(0), today) && hour === currentHour;

                return (
                  <div key={hour} className="grid grid-cols-[70px_repeat(7,1fr)] min-h-[48px] relative">
                    <div className="p-1 text-right pr-2 text-xs text-muted-foreground border-r font-mono">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    {weekDates.map((date, dayIdx) => {
                      const dayAppts = parsedAppointments.filter((a) =>
                        isSameDay(a.date, date) && a.date.getHours() === hour
                      );
                      const isToday = isSameDay(date, today);
                      const showNowLine = isToday && hour === currentHour;

                      return (
                        <div
                          key={dayIdx}
                          className={cn(
                            "border-l border-b p-0.5 relative group",
                            isToday && "bg-rasma-teal/5"
                          )}
                        >
                          {showNowLine && (
                            <div
                              className="absolute left-0 right-0 h-0.5 bg-rasma-red z-10"
                              style={{ top: `${(today.getMinutes() / 60) * 100}%` }}
                            />
                          )}
                          {dayAppts.map((appt) => (
                            <Link
                              key={appt.id}
                              href={`/citas/${appt.id}`}
                              className={cn(
                                "block rounded px-1.5 py-0.5 text-[10px] leading-tight border mb-0.5 truncate hover:opacity-80 transition-opacity",
                                statusColors[appt.status] || "bg-gray-50 border-gray-200"
                              )}
                            >
                              <span className="font-bold">{formatTime(appt.date)}</span>{" "}
                              {appt.patientName}
                              {appt.modality === "online" && (
                                <Video className="inline h-2.5 w-2.5 ml-0.5" />
                              )}
                            </Link>
                          ))}
                          <Link
                            href={formatDateLink(date, hour)}
                            className={cn(
                              "flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                              dayAppts.length === 0 ? "absolute inset-0" : "mt-0.5 py-0.5 rounded hover:bg-muted/50"
                            )}
                          >
                            <Plus className="h-3 w-3 text-muted-foreground" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month View */}
      {view === "month" && (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7">
              {DAY_NAMES.map((name) => (
                <div key={name} className="p-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b">
                  {name}
                </div>
              ))}
              {monthWeeks.map((week, weekIdx) =>
                week.map((date, dayIdx) => {
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isToday = isSameDay(date, today);
                  const dayAppts = parsedAppointments.filter((a) => isSameDay(a.date, date));
                  return (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className={cn(
                        "min-h-[90px] p-1.5 border-b border-r group relative",
                        !isCurrentMonth && "bg-muted/20",
                        isToday && "bg-rasma-teal/5"
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <button
                          onClick={() => goToDay(date)}
                          className={cn(
                            "text-xs hover:underline",
                            isToday
                              ? "font-bold text-rasma-teal"
                              : isCurrentMonth
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {date.getDate()}
                        </button>
                        <Link
                          href={formatDateLink(date)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </Link>
                      </div>
                      {dayAppts.slice(0, 4).map((appt) => (
                        <Link
                          key={appt.id}
                          href={`/citas/${appt.id}`}
                          className={cn(
                            "block rounded px-1 py-0.5 text-[10px] leading-tight border mb-0.5 truncate hover:opacity-80",
                            statusColors[appt.status] || "bg-gray-50 border-gray-200"
                          )}
                        >
                          <span className="font-bold">{formatTime(appt.date)}</span>{" "}
                          {appt.patientName}
                        </Link>
                      ))}
                      {dayAppts.length > 4 && (
                        <button
                          onClick={() => goToDay(date)}
                          className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                        >
                          +{dayAppts.length - 4} mas
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
