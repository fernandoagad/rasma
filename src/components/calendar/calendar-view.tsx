"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Video, MapPin, Plus, User, Users, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  formatChileTime,
  formatChileDate,
  getChileHour,
  isSameDayChile,
  getChileMinutesFromMidnight,
} from "@/lib/timezone";

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
  recurringGroupId: string | null;
}

interface CalendarViewProps {
  appointments: CalendarAppointment[];
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
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

const statusColors: Record<string, string> = {
  programada: "bg-rasma-dark/[0.06] border-rasma-dark/20 text-rasma-dark",
  completada: "bg-emerald-50 border-emerald-200 text-emerald-700",
  cancelada: "bg-red-50 border-red-200 text-red-600 line-through opacity-60",
  no_asistio: "bg-amber-50 border-amber-200 text-amber-700",
};

const statusDot: Record<string, string> = {
  programada: "bg-rasma-dark",
  completada: "bg-emerald-500",
  cancelada: "bg-red-400",
  no_asistio: "bg-amber-500",
};

function isSameDay(a: Date, b: Date): boolean {
  return isSameDayChile(a, b);
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
  const currentHour = getChileHour(today);

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
  const goToDay = (date: Date) => { setCurrentDate(date); setView("day"); };

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const monthWeeks = useMemo(() => getMonthDates(currentDate), [currentDate]);

  const weekRange = weekDates.length > 0
    ? `${formatChileDate(weekDates[0], { day: "numeric", month: "short" })} \u2014 ${formatChileDate(weekDates[6], { day: "numeric", month: "short", year: "numeric" })}`
    : "";
  const monthLabel = formatChileDate(currentDate, { month: "long", year: "numeric" });
  const dayDow = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
  const dayLabel = `${DAY_NAMES_FULL[dayDow]}, ${formatChileDate(currentDate, { day: "numeric", month: "long", year: "numeric" })}`;

  const dayAppointments = useMemo(
    () => parsedAppointments.filter((a) => isSameDay(a.date, currentDate)).sort((a, b) => a.date.getTime() - b.date.getTime()),
    [parsedAppointments, currentDate]
  );

  const totalDayAppts = dayAppointments.length;

  return (
    <div className="space-y-4">
      {/* ═══ TOOLBAR ═══ */}
      <div className="flex items-center justify-between rounded-2xl border bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 rounded-xl">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="rounded-xl h-9 px-4 font-semibold text-rasma-dark">
            Hoy
          </Button>
          <Button variant="ghost" size="icon" onClick={goForward} className="h-9 w-9 rounded-xl">
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="hidden sm:flex items-center gap-2 ml-2">
            <h2 className="text-sm font-bold text-rasma-dark capitalize">
              {view === "day" ? dayLabel : view === "week" ? weekRange : monthLabel}
            </h2>
            {view === "day" && totalDayAppts > 0 && (
              <span className="text-xs text-muted-foreground bg-zinc-100 px-2 py-0.5 rounded-full font-medium">
                {totalDayAppts} cita{totalDayAppts !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 rounded-xl border p-0.5 bg-zinc-50">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                view === v
                  ? "bg-rasma-dark text-rasma-lime shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile date label */}
      <h2 className="sm:hidden text-sm font-bold text-rasma-dark capitalize px-1">
        {view === "day" ? dayLabel : view === "week" ? weekRange : monthLabel}
      </h2>

      {/* ═══ DAY VIEW ═══ */}
      {view === "day" && (
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {HOURS.map((hour) => {
              const hourAppts = dayAppointments.filter((a) => getChileHour(a.date) === hour);
              const isCurrentHour = isSameDay(currentDate, today) && hour === currentHour;

              return (
                <div
                  key={hour}
                  className={cn(
                    "flex min-h-[60px] border-b last:border-b-0 relative group",
                    isCurrentHour && "bg-rasma-dark/[0.02]"
                  )}
                >
                  {isCurrentHour && (
                    <div
                      className="absolute left-[72px] right-0 h-0.5 bg-rasma-red z-10"
                      style={{ top: `${(getChileMinutesFromMidnight(today) % 60 / 60) * 100}%` }}
                    >
                      <div className="absolute -left-1.5 -top-[3px] h-2 w-2 rounded-full bg-rasma-red ring-2 ring-white" />
                    </div>
                  )}

                  <div className="w-[72px] shrink-0 p-2 text-right pr-3 text-xs text-muted-foreground border-r font-mono tabular-nums">
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
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all hover:shadow-md",
                            statusColors[appt.status] || "bg-gray-50 border-gray-200"
                          )}
                        >
                          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusDot[appt.status] || "bg-gray-400")} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold tabular-nums">{formatChileTime(appt.date)}</span>
                              <span className="text-xs opacity-40">·</span>
                              <span className="text-xs font-semibold truncate">{appt.patientName}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <SessionIcon className="h-3 w-3 opacity-50" />
                              <span className="text-[10px] opacity-60">{appt.therapistName}</span>
                              <span className="text-[10px] opacity-40">· {appt.durationMinutes} min</span>
                            </div>
                          </div>
                          {appt.recurringGroupId && (
                            <Repeat className="h-3.5 w-3.5 shrink-0 text-rasma-dark/40" />
                          )}
                          {appt.modality === "online" && (
                            <Video className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          )}
                          {appt.modality === "presencial" && (
                            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-40" />
                          )}
                        </Link>
                      );
                    })}
                    <Link
                      href={formatDateLink(currentDate, hour)}
                      className={cn(
                        "flex items-center justify-center min-h-[36px] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:bg-zinc-100",
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

      {/* ═══ WEEK VIEW ═══ */}
      {view === "week" && (
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day headers */}
              <div className="grid grid-cols-[72px_repeat(7,1fr)] border-b bg-zinc-50/50">
                <div className="p-2" />
                {weekDates.map((date, i) => {
                  const isToday = isSameDay(date, today);
                  const dayApptCount = parsedAppointments.filter((a) => isSameDay(a.date, date)).length;
                  return (
                    <button
                      key={i}
                      onClick={() => goToDay(date)}
                      className={cn(
                        "p-2.5 text-center border-l transition-colors hover:bg-zinc-100/50",
                        isToday && "bg-rasma-dark/[0.03]"
                      )}
                    >
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{DAY_NAMES[i]}</p>
                      <p className={cn(
                        "text-base font-bold mt-0.5 leading-none",
                        isToday ? "text-rasma-dark" : "text-foreground/70"
                      )}>
                        {date.getDate()}
                      </p>
                      {isToday && (
                        <div className="h-1 w-5 rounded-full bg-rasma-dark mx-auto mt-1" />
                      )}
                      {!isToday && dayApptCount > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{dayApptCount}</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Time slots */}
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[72px_repeat(7,1fr)] min-h-[50px] relative">
                  <div className="p-1 text-right pr-3 text-xs text-muted-foreground border-r font-mono tabular-nums">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {weekDates.map((date, dayIdx) => {
                    const dayAppts = parsedAppointments.filter((a) =>
                      isSameDay(a.date, date) && getChileHour(a.date) === hour
                    );
                    const isToday = isSameDay(date, today);
                    const showNowLine = isToday && hour === currentHour;

                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          "border-l border-b p-0.5 relative group",
                          isToday && "bg-rasma-dark/[0.02]"
                        )}
                      >
                        {showNowLine && (
                          <div
                            className="absolute left-0 right-0 h-0.5 bg-rasma-red z-10"
                            style={{ top: `${(getChileMinutesFromMidnight(today) % 60 / 60) * 100}%` }}
                          />
                        )}
                        {dayAppts.map((appt) => (
                          <Link
                            key={appt.id}
                            href={`/citas/${appt.id}`}
                            className={cn(
                              "block rounded-lg px-1.5 py-1 text-[10px] leading-tight border mb-0.5 truncate hover:shadow-sm transition-shadow",
                              statusColors[appt.status] || "bg-gray-50 border-gray-200"
                            )}
                          >
                            <span className="font-bold tabular-nums">{formatChileTime(appt.date)}</span>{" "}
                            <span className="font-medium">{appt.patientName}</span>
                            {appt.recurringGroupId && (
                              <Repeat className="inline h-2.5 w-2.5 ml-0.5 opacity-40" />
                            )}
                            {appt.modality === "online" && (
                              <Video className="inline h-2.5 w-2.5 ml-0.5 opacity-50" />
                            )}
                          </Link>
                        ))}
                        <Link
                          href={formatDateLink(date, hour)}
                          className={cn(
                            "flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                            dayAppts.length === 0 ? "absolute inset-0" : "mt-0.5 py-0.5 rounded-lg hover:bg-zinc-100"
                          )}
                        >
                          <Plus className="h-3 w-3 text-muted-foreground" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ MONTH VIEW ═══ */}
      {view === "month" && (
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-7">
              {DAY_NAMES.map((name) => (
                <div key={name} className="p-2.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b bg-zinc-50/50">
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
                        "min-h-[96px] p-1.5 border-b border-r group relative transition-colors",
                        !isCurrentMonth && "bg-zinc-50/50",
                        isToday && "bg-rasma-dark/[0.03]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <button
                          onClick={() => goToDay(date)}
                          className={cn(
                            "h-6 w-6 flex items-center justify-center rounded-md text-xs transition-colors",
                            isToday
                              ? "bg-rasma-dark text-rasma-lime font-bold"
                              : isCurrentMonth
                              ? "text-foreground font-medium hover:bg-zinc-100"
                              : "text-muted-foreground/50"
                          )}
                        >
                          {date.getDate()}
                        </button>
                        <Link
                          href={formatDateLink(date)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-100"
                        >
                          <Plus className="h-3 w-3 text-muted-foreground" />
                        </Link>
                      </div>
                      {dayAppts.slice(0, 3).map((appt) => (
                        <Link
                          key={appt.id}
                          href={`/citas/${appt.id}`}
                          className={cn(
                            "block rounded-md px-1.5 py-0.5 text-[10px] leading-tight border mb-0.5 truncate hover:shadow-sm transition-shadow",
                            statusColors[appt.status] || "bg-gray-50 border-gray-200"
                          )}
                        >
                          <span className="font-bold tabular-nums">{formatChileTime(appt.date)}</span>{" "}
                          {appt.patientName}
                        </Link>
                      ))}
                      {dayAppts.length > 3 && (
                        <button
                          onClick={() => goToDay(date)}
                          className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 font-medium"
                        >
                          +{dayAppts.length - 3} mas
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
