"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  Loader2,
  Check,
  CalendarPlus,
  Brain,
  Stethoscope,
  Heart,
  MessageCircle,
  HandHeart,
  Baby,
  Sparkles,
  GraduationCap,
  Clipboard,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTherapistsWithSlotsForDate, bookAppointment } from "@/actions/patient-booking";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Specialty metadata                                                 */
/* ------------------------------------------------------------------ */

interface SpecialtyMeta {
  icon: LucideIcon;
  bg: string;
  iconColor: string;
  description: string;
}

const SPECIALTY_MAP: { match: string; meta: SpecialtyMeta }[] = [
  { match: "psicólogo/a infantil", meta: { icon: Baby, bg: "bg-violet-100", iconColor: "text-violet-600", description: "Atencion emocional y conductual para ninos y adolescentes" } },
  { match: "psicólogo/a clínico", meta: { icon: Brain, bg: "bg-indigo-100", iconColor: "text-indigo-600", description: "Terapia psicologica para adultos y jovenes" } },
  { match: "psicóloga infantil", meta: { icon: Baby, bg: "bg-violet-100", iconColor: "text-violet-600", description: "Atencion emocional y conductual para ninos y adolescentes" } },
  { match: "psicóloga clínic", meta: { icon: Brain, bg: "bg-indigo-100", iconColor: "text-indigo-600", description: "Terapia psicologica para adultos y jovenes" } },
  { match: "psiquiatra infanto", meta: { icon: Stethoscope, bg: "bg-sky-100", iconColor: "text-sky-600", description: "Evaluacion y tratamiento medico para ninos y adolescentes" } },
  { match: "psiquiatra adulto", meta: { icon: Stethoscope, bg: "bg-blue-100", iconColor: "text-blue-600", description: "Evaluacion y tratamiento medico psiquiatrico para adultos" } },
  { match: "psiquiatr", meta: { icon: Stethoscope, bg: "bg-sky-100", iconColor: "text-sky-600", description: "Evaluacion y tratamiento medico psiquiatrico" } },
  { match: "psicolog", meta: { icon: Brain, bg: "bg-violet-100", iconColor: "text-violet-600", description: "Terapia psicologica y apoyo emocional" } },
  { match: "terapeuta ocupacional", meta: { icon: Sparkles, bg: "bg-teal-100", iconColor: "text-teal-600", description: "Desarrollo de habilidades motoras y de la vida diaria" } },
  { match: "fonoaudiolog", meta: { icon: MessageCircle, bg: "bg-amber-100", iconColor: "text-amber-600", description: "Desarrollo del lenguaje, habla y comunicacion" } },
  { match: "coordinador", meta: { icon: Clipboard, bg: "bg-slate-100", iconColor: "text-slate-600", description: "Coordinacion de atencion y seguimiento clinico" } },
  { match: "orientador", meta: { icon: GraduationCap, bg: "bg-emerald-100", iconColor: "text-emerald-600", description: "Orientacion escolar y apoyo educacional" } },
  { match: "trabajador", meta: { icon: HandHeart, bg: "bg-rose-100", iconColor: "text-rose-500", description: "Apoyo social, familiar y comunitario" } },
];

function getSpecialtyMeta(specialty: string): SpecialtyMeta {
  const lower = specialty.toLowerCase();
  for (const entry of SPECIALTY_MAP) {
    if (lower.includes(entry.match)) return entry.meta;
  }
  return { icon: User, bg: "bg-zinc-100", iconColor: "text-zinc-600", description: "Atencion profesional especializada" };
}

/* ------------------------------------------------------------------ */
/*  Calendar                                                           */
/* ------------------------------------------------------------------ */

interface TherapistWithSlots {
  id: string;
  name: string;
  specialty: string | null;
  image: string | null;
  slots: { time: string; modality: string }[];
}

const DAY_NAMES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) currentWeek.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentWeek.push(new Date(year, month, d));
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }
  return weeks;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isPast(date: Date) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return date < t;
}

function formatDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Step indicator                                                     */
/* ------------------------------------------------------------------ */

const STEPS = [
  { n: 1, label: "Especialidad" },
  { n: 2, label: "Fecha y hora" },
  { n: 3, label: "Confirmar" },
];

function StepIndicator({ current, onGoTo }: { current: number; onGoTo: (step: number) => void }) {
  return (
    <div className="flex items-center gap-1 sm:gap-0 sm:justify-between max-w-md mx-auto mb-6">
      {STEPS.map((s, i) => {
        const canClick = current > s.n;
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-initial">
            <button
              type="button"
              disabled={!canClick}
              onClick={() => canClick && onGoTo(s.n)}
              className={cn("flex flex-col items-center gap-1.5 disabled:cursor-default", canClick && "cursor-pointer")}
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                current > s.n && "bg-emerald-500 text-white hover:ring-2 hover:ring-emerald-300",
                current === s.n && "bg-blue-600 text-white ring-4 ring-blue-100",
                current < s.n && "bg-zinc-100 text-zinc-400",
              )}>
                {current > s.n ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span className={cn(
                "text-xs font-semibold whitespace-nowrap",
                current >= s.n ? "text-rasma-dark" : "text-zinc-400",
              )}>
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-2 sm:mx-4 mt-[-20px]">
                <div className={cn("h-[2px] rounded-full", current > s.n ? "bg-emerald-500" : "bg-zinc-200")} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export function BookingFlow({ specialties }: { specialties: string[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const resultsRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [therapistsWithSlots, setTherapistsWithSlots] = useState<TherapistWithSlots[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState<TherapistWithSlots | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedModality, setSelectedModality] = useState<"presencial" | "online">("presencial");
  const [notes, setNotes] = useState("");
  const [loadingTherapists, setLoadingTherapists] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  const today = new Date();
  const [calMonth, setCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const monthGrid = useMemo(() => getMonthGrid(calMonth.year, calMonth.month), [calMonth]);

  useEffect(() => {
    if (!selectedSpecialty || !selectedDate) return;
    setLoadingTherapists(true);
    setSelectedTherapist(null);
    setSelectedTime("");
    getTherapistsWithSlotsForDate(selectedSpecialty, formatDateStr(selectedDate))
      .then((data) => {
        setTherapistsWithSlots(data);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
      })
      .finally(() => setLoadingTherapists(false));
  }, [selectedSpecialty, selectedDate]);

  useEffect(() => {
    if (selectedTherapist && selectedTime) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  }, [selectedTherapist, selectedTime]);

  const handleSelectSpecialty = useCallback((s: string) => {
    setSelectedSpecialty(s);
    setSelectedDate(null);
    setSelectedTime("");
    setSelectedTherapist(null);
    setTherapistsWithSlots([]);
    setStep(2);
  }, []);

  const goToStep = useCallback((target: number) => {
    if (target >= step) return;
    if (target <= 1) {
      setSelectedSpecialty(null);
      setSelectedDate(null);
      setSelectedTime("");
      setSelectedTherapist(null);
      setTherapistsWithSlots([]);
      setStep(1);
    } else if (target === 2) {
      setSelectedTherapist(null);
      setSelectedTime("");
      setStep(2);
    }
  }, [step]);

  async function handleBook() {
    if (!selectedTherapist || !selectedDate || !selectedTime) return;
    setBooking(true);
    const result = await bookAppointment({
      therapistId: selectedTherapist.id,
      date: formatDateStr(selectedDate),
      time: selectedTime,
      modality: selectedModality,
      notes: notes || undefined,
    });
    setBooking(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      setBooked(true);
      toast.success("Cita agendada correctamente");
      setTimeout(() => router.push("/mis-citas"), 2000);
    }
  }

  /* ---- Success ---- */
  if (booked) {
    return (
      <div className="flex flex-col items-center gap-5 py-16">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="h-10 w-10 text-emerald-600" strokeWidth={2.5} />
          </div>
          <div className="absolute inset-0 rounded-full bg-emerald-200/50 animate-ping" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-rasma-dark">Cita confirmada</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Su cita con <span className="font-semibold text-rasma-dark">{selectedTherapist?.name}</span> ha sido
            agendada para el{" "}
            <span className="font-semibold text-rasma-dark">
              {selectedDate?.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
            </span>{" "}
            a las <span className="font-semibold text-rasma-dark">{selectedTime} hrs</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Redirigiendo a sus citas...
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepIndicator current={step} onGoTo={goToStep} />

      {/* ============================================================ */}
      {/*  STEP 1 — Specialty                                           */}
      {/* ============================================================ */}
      {step === 1 && (
        <div>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-rasma-dark">¿Que tipo de atencion necesita?</h2>
            <p className="text-sm text-muted-foreground mt-1">Elija una especialidad para ver profesionales disponibles</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {specialties.map((specialty) => {
              const meta = getSpecialtyMeta(specialty);
              const Icon = meta.icon;
              return (
                <button
                  key={specialty}
                  onClick={() => handleSelectSpecialty(specialty)}
                  className="group w-full flex items-start gap-4 p-5 rounded-xl border bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-600/5 transition-all duration-200 text-left active:scale-[0.98]"
                >
                  <div className={cn(
                    "h-14 w-14 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    meta.bg,
                  )}>
                    <Icon className={cn("h-7 w-7", meta.iconColor)} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-bold text-rasma-dark leading-snug">{specialty}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{meta.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 2 — Date + time                                         */}
      {/* ============================================================ */}
      {step === 2 && selectedSpecialty && (
        <div className="space-y-4">
          {/* Back + specialty */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => goToStep(1)}
              className="h-9 w-9 rounded-xl border hover:bg-zinc-50 flex items-center justify-center transition-colors shrink-0"
              aria-label="Volver a especialidades"
            >
              <ChevronLeft className="h-4 w-4 text-rasma-dark" />
            </button>
            <div className="flex items-center gap-2.5 py-2 px-4 rounded-xl bg-zinc-50 border">
              {(() => {
                const m = getSpecialtyMeta(selectedSpecialty);
                const Icon = m.icon;
                return (
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", m.bg)}>
                    <Icon className={cn("h-4 w-4", m.iconColor)} />
                  </div>
                );
              })()}
              <span className="text-sm font-bold text-rasma-dark">{selectedSpecialty}</span>
            </div>
          </div>

          {/* Main panel: Calendar + Results side by side */}
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4">

            {/* Calendar */}
            <Card className="rounded-xl">
              <CardContent className="p-5">
                <p className="text-sm font-bold text-rasma-dark mb-4">Seleccione una fecha</p>

                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setCalMonth((p) => {
                      const d = new Date(p.year, p.month - 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })}
                    className="h-9 w-9 rounded-xl hover:bg-zinc-100 flex items-center justify-center transition-colors"
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="h-4 w-4 text-rasma-dark" />
                  </button>
                  <span className="text-sm font-bold text-rasma-dark">
                    {MONTH_NAMES[calMonth.month]} {calMonth.year}
                  </span>
                  <button
                    onClick={() => setCalMonth((p) => {
                      const d = new Date(p.year, p.month + 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })}
                    className="h-9 w-9 rounded-xl hover:bg-zinc-100 flex items-center justify-center transition-colors"
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight className="h-4 w-4 text-rasma-dark" />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>
                  ))}
                </div>

                {monthGrid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {week.map((date, di) => {
                      if (!date) return <div key={di} className="h-11" />;
                      const past = isPast(date);
                      const isToday = isSameDay(date, today);
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <button
                          key={di}
                          disabled={past}
                          onClick={() => setSelectedDate(date)}
                          className={cn(
                            "h-11 w-full rounded-xl text-sm font-medium transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1",
                            past && "text-zinc-300 cursor-not-allowed",
                            !past && !isSelected && "hover:bg-blue-50 active:scale-95",
                            !past && isWeekend && !isSelected && "text-zinc-500",
                            !past && !isWeekend && !isSelected && "text-rasma-dark",
                            isToday && !isSelected && "font-bold",
                            isSelected && "bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/25",
                          )}
                        >
                          {date.getDate()}
                          {isToday && !isSelected && (
                            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-blue-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Results panel */}
            <Card className="rounded-xl" ref={resultsRef}>
              <CardContent className="p-5">
                {!selectedDate ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
                    <div className="h-16 w-16 rounded-xl bg-zinc-100 flex items-center justify-center">
                      <CalendarPlus className="h-8 w-8 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-rasma-dark">Seleccione una fecha</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
                        Elija un dia en el calendario para ver los profesionales y horarios disponibles
                      </p>
                    </div>
                  </div>
                ) : loadingTherapists ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    <p className="text-sm text-muted-foreground">Buscando disponibilidad...</p>
                  </div>
                ) : therapistsWithSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
                    <div className="h-16 w-16 rounded-xl bg-zinc-100 flex items-center justify-center">
                      <Clock className="h-8 w-8 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-rasma-dark">Sin disponibilidad</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
                        No hay profesionales disponibles este dia. Pruebe con otra fecha.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <p className="text-sm font-bold text-rasma-dark capitalize">
                        {selectedDate.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Seleccione un profesional y horario
                      </p>
                    </div>

                    <div className="space-y-3">
                      {therapistsWithSlots.map((therapist) => {
                        const isThisSelected = selectedTherapist?.id === therapist.id;
                        return (
                          <div
                            key={therapist.id}
                            className={cn(
                              "rounded-xl border-2 p-4 transition-all",
                              isThisSelected && selectedTime
                                ? "border-blue-600 bg-blue-50/30"
                                : "border-zinc-100 hover:border-zinc-200",
                            )}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <AvatarInitials name={therapist.name} size="md" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-rasma-dark">{therapist.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {therapist.slots.length} horario{therapist.slots.length !== 1 ? "s" : ""} disponible{therapist.slots.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {therapist.slots.map((slot) => {
                                const isActive = isThisSelected && selectedTime === slot.time;
                                return (
                                  <button
                                    key={slot.time}
                                    onClick={() => {
                                      setSelectedTherapist(therapist);
                                      setSelectedTime(slot.time);
                                    }}
                                    className={cn(
                                      "h-10 px-4 rounded-xl text-sm font-bold transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                                      isActive
                                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                                        : "bg-zinc-100 text-rasma-dark hover:bg-blue-50",
                                    )}
                                  >
                                    {slot.time}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom: modality + notes + continue */}
          {selectedTherapist && selectedTime && (
            <Card className="rounded-xl" ref={bottomRef}>
              <CardContent className="p-5">
                <div className="grid lg:grid-cols-[1fr_1fr_auto] gap-4 items-end">

                  {/* Selection summary + modality */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                      <p className="text-sm text-rasma-dark">
                        <span className="font-bold">{selectedTherapist.name}</span>
                        {" — "}
                        <span className="font-bold">{selectedTime} hrs</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-rasma-dark mb-2">¿Como prefiere la sesion?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { value: "presencial" as const, label: "Presencial", desc: "En la consulta", Icon: MapPin },
                          { value: "online" as const, label: "Online", desc: "Por videollamada", Icon: Video },
                        ]).map(({ value, label, desc, Icon }) => (
                          <button
                            key={value}
                            onClick={() => setSelectedModality(value)}
                            className={cn(
                              "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                              selectedModality === value
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-zinc-200 hover:border-zinc-300 text-rasma-dark",
                            )}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <div className="text-left">
                              <p className="text-sm font-bold leading-tight">{label}</p>
                              <p className={cn(
                                "text-[11px]",
                                selectedModality === value ? "text-blue-100" : "text-muted-foreground",
                              )}>{desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-bold text-rasma-dark">Notas (opcional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Motivo de consulta o comentarios..."
                      rows={4}
                      className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300 transition-all placeholder:text-zinc-400"
                    />
                  </div>

                  {/* Continue */}
                  <Button
                    onClick={() => setStep(3)}
                    className="h-11 px-5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-base font-semibold gap-2 shadow-sm shadow-blue-600/20 active:scale-[0.98] transition-all w-full lg:w-auto"
                  >
                    Confirmar
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 3 — Confirm                                             */}
      {/* ============================================================ */}
      {step === 3 && selectedTherapist && selectedDate && selectedTime && (
        <div className="max-w-xl mx-auto space-y-4">
          <button
            onClick={() => goToStep(2)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-rasma-dark transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Modificar seleccion
          </button>

          <Card className="rounded-xl overflow-hidden border-0 shadow-lg shadow-blue-600/10">
            <div className="bg-blue-600 px-6 pt-6 pb-5">
              <p className="text-[11px] font-bold text-blue-200 uppercase tracking-widest mb-3">Resumen de su cita</p>
              <div className="flex items-center gap-3">
                <CalendarPlus className="h-6 w-6 text-white shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-white capitalize">
                    {selectedDate.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
                  </h2>
                  <p className="text-lg font-bold text-blue-100 mt-0.5">{selectedTime} hrs</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50">
                <AvatarInitials name={selectedTherapist.name} size="md" />
                <div>
                  <p className="text-sm font-bold text-rasma-dark">{selectedTherapist.name}</p>
                  {selectedSpecialty && <p className="text-xs text-muted-foreground">{selectedSpecialty}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Modalidad</p>
                  <div className="flex items-center gap-2">
                    {selectedModality === "online" ? <Video className="h-4 w-4 text-rasma-dark" /> : <MapPin className="h-4 w-4 text-rasma-dark" />}
                    <span className="text-sm font-semibold text-rasma-dark">
                      {selectedModality === "online" ? "Online" : "Presencial"}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Duracion</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-rasma-dark" />
                    <span className="text-sm font-semibold text-rasma-dark">50 min</span>
                  </div>
                </div>
              </div>

              {selectedModality === "online" && (
                <p className="text-sm text-rasma-dark bg-blue-50 rounded-xl px-4 py-3">
                  Se generara automaticamente un enlace de Google Meet para su sesion.
                </p>
              )}

              {notes && (
                <div className="p-3 rounded-xl bg-zinc-50">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Notas</p>
                  <p className="text-sm text-rasma-dark">{notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => goToStep(2)}
                  className="flex-1 h-11 rounded-xl font-semibold text-sm"
                  disabled={booking}
                >
                  Volver
                </Button>
                <Button
                  onClick={handleBook}
                  disabled={booking}
                  className="flex-1 h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-base gap-2 shadow-sm shadow-blue-600/20 active:scale-[0.98] transition-all"
                >
                  {booking ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Agendando...</>
                  ) : (
                    <><CalendarPlus className="h-4 w-4" /> Confirmar cita</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
