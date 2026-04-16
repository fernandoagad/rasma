"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  CalendarOff,
  Plus,
  Loader2,
  Save,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Video,
  Check,
  Copy,
  Trash2,
  ArrowRight,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTherapistAvailability,
  setTherapistAvailability,
  getTherapistExceptions,
  addTherapistExceptions,
  removeTherapistException,
} from "@/actions/therapist-availability";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Block {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  modality: "presencial" | "online" | "ambos";
  active: boolean;
}

interface Exception { id: string; date: string; reason: string | null }

interface DaySchedule {
  enabled: boolean;
  ranges: { start: string; end: string }[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ORDERED_DAYS = [
  { n: 1, full: "Lunes" },
  { n: 2, full: "Martes" },
  { n: 3, full: "Miercoles" },
  { n: 4, full: "Jueves" },
  { n: 5, full: "Viernes" },
  { n: 6, full: "Sabado" },
  { n: 0, full: "Domingo" },
];

const CAL_DAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

/* ------------------------------------------------------------------ */
/*  12-hour time picker — Hour, Minute, AM/PM                          */
/* ------------------------------------------------------------------ */

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 15, 30, 45];

function to12(h24: number): { h12: number; period: "AM" | "PM" } {
  if (h24 === 0) return { h12: 12, period: "AM" };
  if (h24 < 12) return { h12: h24, period: "AM" };
  if (h24 === 12) return { h12: 12, period: "PM" };
  return { h12: h24 - 12, period: "PM" };
}

function to24(h12: number, period: "AM" | "PM"): number {
  if (period === "AM") return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

function parse24(val: string): { hour: number; minute: number } {
  const [h, m] = val.split(":").map(Number);
  return { hour: h, minute: m };
}

function format24(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function displayTime(val: string): string {
  const { hour, minute } = parse24(val);
  const { h12, period } = to12(hour);
  return `${h12}:${String(minute).padStart(2, "0")} ${period}`;
}

function TimePicker({
  label,
  value,
  onChange,
  minTime,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Optional minimum time in "HH:MM" 24h format — filters out earlier options */
  minTime?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const { hour: h24, minute: curMin } = parse24(value);
  const { h12: curH12, period: curPeriod } = to12(h24);

  // Parse minTime into total minutes for comparison
  const minTotal = minTime ? (() => {
    const { hour: mh, minute: mm } = parse24(minTime);
    return mh * 60 + mm + 15; // at least 15 min after start
  })() : 0;

  // Build the list of valid 24h hours, then convert to display groups
  const validHours: { h12: number; period: "AM" | "PM" }[] = useMemo(() => {
    const result: { h12: number; period: "AM" | "PM" }[] = [];
    for (let h24i = 0; h24i < 24; h24i++) {
      const hasValidMinute = MINUTES.some((m) => h24i * 60 + m >= minTotal);
      if (!hasValidMinute) continue;
      const { h12, period } = to12(h24i);
      if (!result.some((r) => r.h12 === h12 && r.period === period)) {
        result.push({ h12, period });
      }
    }
    return result;
  }, [minTotal]);

  const availablePeriods = useMemo(() => {
    return new Set(validHours.map((h) => h.period));
  }, [validHours]);

  const hoursForPeriod = useMemo(() => {
    const hours = validHours.filter((h) => h.period === curPeriod).map((h) => h.h12);
    // Sort so 1–11 come before 12 (natural reading order)
    hours.sort((a, b) => (a === 12 ? 13 : a) - (b === 12 ? 13 : b));
    return hours;
  }, [validHours, curPeriod]);

  const validMinutes = useMemo(() => {
    return MINUTES.filter((m) => h24 * 60 + m >= minTotal);
  }, [h24, minTotal]);

  function pickHour(h12: number) {
    const newH24 = to24(h12, curPeriod);
    const newValidMins = MINUTES.filter((m) => newH24 * 60 + m >= minTotal);
    const newMin = newValidMins.includes(curMin) ? curMin : (newValidMins[0] ?? 0);
    onChange(format24(newH24, newMin));
  }
  function pickMinute(m: number) {
    onChange(format24(h24, m));
  }
  function togglePeriod(p: "AM" | "PM") {
    if (p === curPeriod) return;
    const hoursInNewPeriod = validHours.filter((h) => h.period === p);
    if (hoursInNewPeriod.length === 0) return;
    const newH12 = hoursInNewPeriod[0].h12;
    const newH24 = to24(newH12, p);
    const newValidMins = MINUTES.filter((m) => newH24 * 60 + m >= minTotal);
    onChange(format24(newH24, newValidMins[0] ?? 0));
  }

  function handleOpen() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // A transformed ancestor (Radix Dialog uses translate) becomes the containing
      // block for position:fixed descendants — compensate so viewport coords land right.
      let offsetLeft = 0;
      let offsetTop = 0;
      let ancestor: HTMLElement | null = triggerRef.current.parentElement;
      while (ancestor) {
        const t = window.getComputedStyle(ancestor).transform;
        if (t && t !== "none") {
          const r = ancestor.getBoundingClientRect();
          offsetLeft = r.left;
          offsetTop = r.top;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      setPos({ top: rect.bottom + 4 - offsetTop, left: rect.left - offsetLeft });
    }
    setOpen(true);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const showPeriodToggle = availablePeriods.size > 1;

  return (
    <div className="flex-1">
      <p className="text-xs font-bold text-rasma-dark mb-1.5">{label}</p>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? setOpen(false) : handleOpen()}
        className={cn(
          "w-full h-12 px-4 rounded-xl border-2 bg-white flex items-center justify-between transition-all",
          open ? "border-rasma-dark shadow-sm" : "border-zinc-200 hover:border-zinc-300",
        )}
      >
        <span className="text-lg font-bold text-rasma-dark tracking-wide">{displayTime(value)}</span>
        <Clock className="h-4 w-4 text-zinc-400" />
      </button>

      {/* Fixed-position panel — inside DialogContent so Radix focus trap allows clicks */}
      {open && (
        <div
          ref={panelRef}
          className="fixed z-[999] bg-white border-2 border-rasma-dark rounded-xl shadow-lg w-[200px]"
          style={{ top: pos.top, left: pos.left }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {showPeriodToggle && (
            <div className="flex gap-1 p-2 pb-0">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePeriod(p)}
                  className={cn(
                    "flex-1 h-8 rounded-lg text-xs font-bold tracking-wide transition-all",
                    curPeriod === p
                      ? "bg-rasma-dark text-rasma-lime"
                      : "bg-rasma-gray-100 text-rasma-gray-400 hover:text-rasma-dark",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1 p-2">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-rasma-gray-400 uppercase tracking-widest text-center mb-1">Hora</p>
              <div className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                {hoursForPeriod.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => pickHour(h)}
                    className={cn(
                      "w-full h-9 rounded-lg text-sm font-bold transition-all shrink-0",
                      curH12 === h
                        ? "bg-rasma-dark text-rasma-lime"
                        : "text-rasma-dark hover:bg-rasma-gray-100",
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <p className="text-[10px] font-bold text-rasma-gray-400 uppercase tracking-widest text-center mb-1">Min</p>
              <div className="flex flex-col gap-0.5">
                {validMinutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pickMinute(m)}
                    className={cn(
                      "w-full h-9 rounded-lg text-sm font-bold transition-all",
                      curMin === m
                        ? "bg-rasma-dark text-rasma-lime"
                        : "text-rasma-dark hover:bg-rasma-gray-100",
                    )}
                  >
                    :{String(m).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Calendar helpers (for exceptions)                                  */
/* ------------------------------------------------------------------ */

function getMonthGrid(y: number, m: number): (Date | null)[][] {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const off = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (let i = 0; i < off; i++) week.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(y, m, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }
  return weeks;
}
function fmtD(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function samD(a: Date, b: Date) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function pastD(d: Date) { const t = new Date(); t.setHours(0,0,0,0); return d < t; }

/* ------------------------------------------------------------------ */
/*  Wizard step progress bar                                           */
/* ------------------------------------------------------------------ */

function WizardProgress({
  steps,
  current,
  onGoTo,
}: {
  steps: { label: string }[];
  current: number;
  onGoTo: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 px-1">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <button
            key={i}
            onClick={() => i < current && onGoTo(i)}
            disabled={i >= current}
            className={cn(
              "flex-1 h-2 rounded-full transition-all",
              done && "bg-rasma-dark cursor-pointer hover:bg-rasma-dark/80",
              active && "bg-rasma-lime",
              !done && !active && "bg-zinc-200",
            )}
            title={s.label}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AvailabilityDialog({
  therapistId,
  open,
  onOpenChange,
  isFirstTime = false,
}: {
  therapistId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirstTime?: boolean;
}) {
  const [view, setView] = useState<"wizard" | "exceptions">("wizard");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Wizard state — persists across steps
  const [duration, setDuration] = useState(50);
  const [modality, setModality] = useState<"presencial" | "online" | "ambos">("ambos");
  const [enabledDays, setEnabledDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [daySchedules, setDaySchedules] = useState<Record<number, DaySchedule["ranges"]>>({});

  // The day we're currently editing in step 3
  const activeDaysList = useMemo(() => ORDERED_DAYS.filter((d) => enabledDays.has(d.n)), [enabledDays]);
  const [dayIndex, setDayIndex] = useState(0);

  // Exceptions
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const today = new Date();
  const [calMonth, setCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const monthGrid = useMemo(() => getMonthGrid(calMonth.year, calMonth.month), [calMonth]);
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());
  const [excReason, setExcReason] = useState("");
  const [addingExc, setAddingExc] = useState(false);
  const existingExcDates = useMemo(() => new Set(exceptions.map((e) => e.date)), [exceptions]);

  // ── Load data ──
  const load = useCallback(async () => {
    setLoading(true);
    const [avail, exc] = await Promise.all([
      getTherapistAvailability(therapistId),
      getTherapistExceptions(therapistId),
    ]);
    if (avail.length > 0) {
      setDuration(avail[0].slotDurationMinutes);
      setModality(avail[0].modality as Block["modality"]);
      const days = new Set<number>();
      const schedules: Record<number, DaySchedule["ranges"]> = {};
      for (const a of avail) {
        days.add(a.dayOfWeek);
        if (!schedules[a.dayOfWeek]) schedules[a.dayOfWeek] = [];
        schedules[a.dayOfWeek].push({ start: a.startTime, end: a.endTime });
      }
      setEnabledDays(days);
      setDaySchedules(schedules);
    }
    setExceptions(exc.map((e) => ({ id: e.id, date: e.date, reason: e.reason })));
    setLoading(false);
  }, [therapistId]);

  useEffect(() => {
    if (open) {
      load();
      setStep(0);
      setDayIndex(0);
      setView("wizard");
      setPendingDates(new Set());
      setExcReason("");
    }
  }, [open, load]);

  // ── Get ranges for a day (with default) ──
  function getRanges(dayN: number): DaySchedule["ranges"] {
    return daySchedules[dayN] || [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }];
  }

  function setRanges(dayN: number, ranges: DaySchedule["ranges"]) {
    setDaySchedules((prev) => ({ ...prev, [dayN]: ranges }));
  }

  function updateRange(dayN: number, idx: number, field: "start" | "end", value: string) {
    const ranges = [...getRanges(dayN)];
    ranges[idx] = { ...ranges[idx], [field]: value };
    setRanges(dayN, ranges);
  }

  function addRange(dayN: number) {
    const ranges = [...getRanges(dayN)];
    ranges.push({ start: "09:00", end: "13:00" });
    setRanges(dayN, ranges);
  }

  function removeRange(dayN: number, idx: number) {
    const ranges = getRanges(dayN).filter((_, i) => i !== idx);
    setRanges(dayN, ranges);
  }

  function copyFromPrevDay() {
    if (dayIndex <= 0) return;
    const prevDay = activeDaysList[dayIndex - 1].n;
    const currentDay = activeDaysList[dayIndex].n;
    setRanges(currentDay, [...getRanges(prevDay)]);
    toast.success(`Horario copiado de ${activeDaysList[dayIndex - 1].full}`);
  }

  // ── Save ──
  async function handleSave() {
    setSaving(true);
    const blocks: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes: number;
      modality: "presencial" | "online" | "ambos";
    }[] = [];

    for (const day of activeDaysList) {
      for (const range of getRanges(day.n)) {
        blocks.push({
          dayOfWeek: day.n,
          startTime: range.start,
          endTime: range.end,
          slotDurationMinutes: duration,
          modality,
        });
      }
    }

    const result = await setTherapistAvailability(therapistId, blocks);
    if (result.success) {
      toast.success("Horarios guardados correctamente");
      if (isFirstTime) onOpenChange(false);
    }
    setSaving(false);
  }

  // ── Exception handlers ──
  function togglePendingDate(ds: string) {
    setPendingDates((prev) => { const n = new Set(prev); if (n.has(ds)) n.delete(ds); else n.add(ds); return n; });
  }

  async function handleAddExceptions() {
    if (pendingDates.size === 0) return;
    setAddingExc(true);
    const dates = Array.from(pendingDates).map((d) => ({ date: d, reason: excReason || undefined }));
    const result = await addTherapistExceptions(therapistId, dates);
    if (result.success) {
      toast.success(`${result.added} dia${result.added !== 1 ? "s" : ""} bloqueado${result.added !== 1 ? "s" : ""}`);
      setPendingDates(new Set());
      setExcReason("");
      const exc = await getTherapistExceptions(therapistId);
      setExceptions(exc.map((e) => ({ id: e.id, date: e.date, reason: e.reason })));
    }
    setAddingExc(false);
  }

  async function handleRemoveException(id: string) {
    await removeTherapistException(id);
    setExceptions((prev) => prev.filter((e) => e.id !== id));
    toast.success("Dia desbloqueado");
  }

  // ── Wizard steps definition ──
  // Step 0: Duration, Step 1: Modality, Step 2: Days, Step 3: Per-day hours, Step 4: Summary
  const wizardSteps = [
    { label: "Duracion" },
    { label: "Modalidad" },
    { label: "Dias" },
    { label: "Horarios" },
    { label: "Listo" },
  ];

  const canNext = step < wizardSteps.length - 1;
  const canBack = step > 0;

  function goNext() {
    if (step === 3) {
      // In per-day mode: advance to next day or to summary
      if (dayIndex < activeDaysList.length - 1) {
        setDayIndex(dayIndex + 1);
      } else {
        setStep(4);
      }
    } else if (step === 2 && activeDaysList.length > 0) {
      setDayIndex(0);
      setStep(3);
    } else if (step < 4) {
      setStep(step + 1);
    }
  }

  function goBack() {
    if (step === 3 && dayIndex > 0) {
      setDayIndex(dayIndex - 1);
    } else if (step > 0) {
      setStep(step - 1);
    }
  }

  // ── Current day for step 3 ──
  const currentDay = step === 3 && activeDaysList[dayIndex] ? activeDaysList[dayIndex] : null;
  const currentRanges = currentDay ? getRanges(currentDay.n) : [];

  return (
    <Dialog open={open} onOpenChange={isFirstTime ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0" showCloseButton={!isFirstTime}>

        {/* ─── Header ─── */}
        <div className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-rasma-dark">
              <div className="h-8 w-8 rounded-xl bg-rasma-dark flex items-center justify-center shrink-0">
                <CalendarClock className="h-4 w-4 text-rasma-lime" />
              </div>
              {isFirstTime ? "Configure sus horarios" : "Mis horarios"}
            </DialogTitle>
            <DialogDescription className="sr-only">Configuracion de horarios de atencion</DialogDescription>
          </DialogHeader>

          {/* View toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-rasma-gray-100 mt-3">
            <button onClick={() => setView("wizard")} className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all", view === "wizard" ? "bg-white text-rasma-dark shadow-sm" : "text-zinc-500 hover:text-rasma-dark")}>
              <Clock className="h-4 w-4" />Mi horario
            </button>
            <button onClick={() => setView("exceptions")} className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all", view === "exceptions" ? "bg-white text-rasma-dark shadow-sm" : "text-zinc-500 hover:text-rasma-dark")}>
              <CalendarOff className="h-4 w-4" />Dias libres
              {exceptions.length > 0 && <span className="text-[10px] font-bold bg-rasma-red/10 text-rasma-red rounded-full h-5 min-w-5 flex items-center justify-center px-1">{exceptions.length}</span>}
            </button>
          </div>

          {/* Wizard progress (only in wizard view) */}
          {view === "wizard" && !loading && (
            <div className="mt-3">
              <WizardProgress steps={wizardSteps} current={step} onGoTo={setStep} />
              <p className="text-xs text-muted-foreground text-center mt-2">
                Paso {step + 1} de {wizardSteps.length}
                {step === 3 && activeDaysList.length > 1 && ` — ${currentDay?.full} (${dayIndex + 1}/${activeDaysList.length})`}
              </p>
            </div>
          )}
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2.5 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando...</span>
            </div>
          ) : view === "wizard" ? (
            <>
              {/* ═══ STEP 0: Duration ═══ */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-rasma-dark">¿Cuanto dura cada sesion?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Seleccione la duracion de sus consultas</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                    {[
                      { v: 30, label: "30 minutos", desc: "Sesion breve" },
                      { v: 45, label: "45 minutos", desc: "Sesion corta" },
                      { v: 50, label: "50 minutos", desc: "Sesion estandar" },
                      { v: 60, label: "1 hora", desc: "Sesion completa" },
                      { v: 90, label: "1 hora 30 min", desc: "Sesion extendida" },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        onClick={() => setDuration(opt.v)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.98] text-left",
                          duration === opt.v
                            ? "border-rasma-dark bg-rasma-dark"
                            : "border-zinc-200 bg-white hover:border-zinc-300",
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold",
                          duration === opt.v ? "bg-rasma-lime text-rasma-dark" : "bg-rasma-gray-100 text-rasma-dark",
                        )}>
                          {opt.v}
                        </div>
                        <div>
                          <p className={cn("text-base font-bold", duration === opt.v ? "text-rasma-lime" : "text-rasma-dark")}>{opt.label}</p>
                          <p className={cn("text-xs", duration === opt.v ? "text-rasma-lime/60" : "text-muted-foreground")}>{opt.desc}</p>
                        </div>
                        {duration === opt.v && <Check className="h-5 w-5 text-rasma-lime ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ STEP 1: Modality ═══ */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-rasma-dark">¿Como atiende a sus pacientes?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Seleccione el tipo de atencion que ofrece</p>
                  </div>
                  <div className="grid gap-2 max-w-sm mx-auto">
                    {([
                      { v: "presencial" as const, label: "Solo presencial", desc: "El paciente va a su consulta", Icon: MapPin },
                      { v: "online" as const, label: "Solo online", desc: "Atencion por videollamada", Icon: Video },
                      { v: "ambos" as const, label: "Presencial y online", desc: "El paciente elige como prefiere", Icon: Check },
                    ]).map(({ v, label, desc, Icon }) => (
                      <button
                        key={v}
                        onClick={() => setModality(v)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.98] text-left",
                          modality === v
                            ? "border-rasma-dark bg-rasma-dark"
                            : "border-zinc-200 bg-white hover:border-zinc-300",
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          modality === v ? "bg-rasma-lime text-rasma-dark" : "bg-rasma-gray-100 text-rasma-dark",
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className={cn("text-base font-bold", modality === v ? "text-rasma-lime" : "text-rasma-dark")}>{label}</p>
                          <p className={cn("text-xs", modality === v ? "text-rasma-lime/60" : "text-muted-foreground")}>{desc}</p>
                        </div>
                        {modality === v && <Check className="h-5 w-5 text-rasma-lime ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ STEP 2: Which days ═══ */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-rasma-dark">¿Que dias atiende?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Toque los dias en que recibe pacientes</p>
                  </div>
                  <div className="space-y-2 max-w-sm mx-auto">
                    {ORDERED_DAYS.map((day) => {
                      const isOn = enabledDays.has(day.n);
                      return (
                        <button
                          key={day.n}
                          onClick={() => {
                            setEnabledDays((prev) => {
                              const next = new Set(prev);
                              if (next.has(day.n)) next.delete(day.n); else next.add(day.n);
                              return next;
                            });
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all active:scale-[0.98]",
                            isOn
                              ? "border-rasma-dark bg-rasma-dark"
                              : "border-zinc-200 bg-white hover:border-zinc-300",
                          )}
                        >
                          <span className={cn("text-base font-bold", isOn ? "text-rasma-lime" : "text-rasma-dark")}>
                            {day.full}
                          </span>
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                            isOn ? "bg-rasma-lime" : "bg-zinc-100",
                          )}>
                            {isOn ? <Check className="h-4 w-4 text-rasma-dark" /> : <span className="h-4 w-4" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══ STEP 3: Per-day hours ═══ */}
              {step === 3 && currentDay && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rasma-dark text-rasma-lime text-sm font-bold mb-3">
                      {currentDay.full}
                    </div>
                    <h2 className="text-xl font-bold text-rasma-dark">
                      ¿A que hora atiende los {currentDay.full.toLowerCase()}?
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure sus horarios de atencion para este dia
                    </p>
                  </div>

                  {/* Copy from previous day */}
                  {dayIndex > 0 && (
                    <button
                      onClick={copyFromPrevDay}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 hover:border-rasma-dark hover:bg-rasma-gray-100 transition-all active:scale-[0.98]"
                    >
                      <div className="h-9 w-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                        <Copy className="h-4 w-4 text-rasma-dark" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-rasma-dark">
                          Repetir horario del {activeDaysList[dayIndex - 1].full}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Usar las mismas horas que el dia anterior
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Time ranges */}
                  <div className="space-y-4">
                    {currentRanges.map((range, ri) => (
                      <div key={ri} className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {ri === 0 && currentRanges.length <= 2 ? "Horario de la manana" : ri === 1 && currentRanges.length === 2 ? "Horario de la tarde" : `Horario ${ri + 1}`}
                          </p>
                          {currentRanges.length > 1 && (
                            <button
                              onClick={() => removeRange(currentDay.n, ri)}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rasma-red hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-end gap-3">
                          <TimePicker
                            label="Empiezo a atender a las"
                            value={range.start}
                            onChange={(v) => updateRange(currentDay.n, ri, "start", v)}
                          />
                          <div className="pb-1 text-zinc-400 font-bold shrink-0">→</div>
                          <TimePicker
                            label="Termino de atender a las"
                            value={range.end}
                            onChange={(v) => updateRange(currentDay.n, ri, "end", v)}
                            minTime={range.start}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => addRange(currentDay.n)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-zinc-300 hover:border-zinc-400 transition-all active:scale-[0.98]"
                  >
                    <div className="h-9 w-9 rounded-lg bg-rasma-gray-100 flex items-center justify-center shrink-0">
                      <Plus className="h-4 w-4 text-rasma-dark" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-rasma-dark">Agregar otro horario</p>
                      <p className="text-xs text-muted-foreground">
                        Por ejemplo, si hace pausa de almuerzo
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* ═══ STEP 4: Summary ═══ */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <PartyPopper className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-rasma-dark">Todo listo</h2>
                    <p className="text-sm text-muted-foreground mt-1">Revise su horario y guarde los cambios</p>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-rasma-gray-100 p-3">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Duracion</p>
                      <p className="text-base font-bold text-rasma-dark mt-0.5">{duration} min</p>
                    </div>
                    <div className="rounded-xl bg-rasma-gray-100 p-3">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Modalidad</p>
                      <p className="text-base font-bold text-rasma-dark mt-0.5 capitalize">{modality === "ambos" ? "Presencial y online" : modality}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {activeDaysList.map((day) => {
                      const ranges = getRanges(day.n);
                      return (
                        <div key={day.n} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rasma-gray-100">
                          <div className="h-8 w-8 rounded-lg bg-rasma-dark text-rasma-lime flex items-center justify-center shrink-0">
                            <Check className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-rasma-dark">{day.full}</p>
                            <p className="text-xs text-muted-foreground">
                              {ranges.map((r, i) => `${r.start} a ${r.end}`).join("  ·  ")}
                            </p>
                          </div>
                          <button
                            onClick={() => { setStep(3); setDayIndex(activeDaysList.indexOf(day)); }}
                            className="text-xs font-semibold text-muted-foreground hover:text-rasma-dark transition-colors shrink-0"
                          >
                            Editar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ═══ EXCEPTIONS VIEW ═══ */
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-rasma-dark">¿Que dias no va a atender?</h2>
                <p className="text-sm text-muted-foreground mt-1">Toque los dias que no estara disponible</p>
              </div>

              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCalMonth((p) => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="h-9 w-9 rounded-xl hover:bg-zinc-100 flex items-center justify-center"><ChevronLeft className="h-4 w-4 text-rasma-dark" /></button>
                  <span className="text-sm font-bold text-rasma-dark">{MONTHS[calMonth.month]} {calMonth.year}</span>
                  <button onClick={() => setCalMonth((p) => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="h-9 w-9 rounded-xl hover:bg-zinc-100 flex items-center justify-center"><ChevronRight className="h-4 w-4 text-rasma-dark" /></button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {CAL_DAYS.map((d, i) => <div key={i} className="text-center text-xs font-bold text-muted-foreground py-1.5">{d}</div>)}
                </div>
                {monthGrid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-px">
                    {week.map((date, di) => {
                      if (!date) return <div key={di} className="h-10" />;
                      const past = pastD(date);
                      const ds = fmtD(date);
                      const isEx = existingExcDates.has(ds);
                      const isPend = pendingDates.has(ds);
                      const isTod = samD(date, today);
                      return (
                        <button key={di} disabled={past || isEx} onClick={() => !isEx && togglePendingDate(ds)}
                          className={cn("h-10 w-full rounded-xl text-sm font-medium transition-all relative outline-none",
                            past && "text-zinc-300 cursor-not-allowed",
                            isEx && "bg-rasma-red/15 text-rasma-red font-bold cursor-default line-through",
                            isPend && "bg-rasma-red text-white font-bold shadow-sm",
                            !past && !isEx && !isPend && "text-rasma-dark hover:bg-zinc-100 active:scale-95",
                            isTod && !isEx && !isPend && "font-bold ring-2 ring-rasma-dark/10",
                          )}>
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="flex items-center gap-5 mt-3 pt-3 border-t text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rasma-red inline-block" /> Seleccionado</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rasma-red/15 border border-rasma-red/30 inline-block" /> Ya bloqueado</span>
                </div>
              </div>

              {pendingDates.size > 0 && (
                <div className="rounded-xl border-2 border-rasma-red/20 bg-red-50/40 p-4 space-y-3">
                  <p className="text-sm font-bold text-rasma-dark">Va a bloquear {pendingDates.size} dia{pendingDates.size !== 1 ? "s" : ""}</p>
                  <div>
                    <label className="text-xs font-bold text-rasma-dark mb-1.5 block">¿Por que? (opcional)</label>
                    <input type="text" value={excReason} onChange={(e) => setExcReason(e.target.value)} placeholder="Vacaciones, Feriado..."
                      className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-rasma-dark placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rasma-teal/20 transition-all" />
                  </div>
                  <Button onClick={handleAddExceptions} disabled={addingExc} className="w-full h-11 rounded-xl bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 text-sm font-bold gap-2">
                    {addingExc ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarOff className="h-4 w-4" />}
                    Confirmar bloqueo
                  </Button>
                </div>
              )}

              {exceptions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-rasma-dark uppercase tracking-wider mb-2">Dias bloqueados</p>
                  <div className="space-y-1.5">
                    {exceptions.map((exc) => (
                      <div key={exc.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rasma-gray-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-rasma-red/10 flex items-center justify-center shrink-0"><CalendarOff className="h-4 w-4 text-rasma-red" /></div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-rasma-dark truncate capitalize">{new Date(exc.date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}</p>
                            {exc.reason && <p className="text-xs text-muted-foreground truncate">{exc.reason}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleRemoveException(exc.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rasma-red hover:bg-red-50 transition-colors shrink-0"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        {!loading && view === "wizard" && (
          <div className="shrink-0 border-t px-6 py-4 bg-rasma-gray-100/50">
            {step < 4 ? (
              <div className="flex gap-3">
                {canBack && (
                  <Button variant="outline" onClick={goBack} className="flex-1 h-12 rounded-xl font-semibold gap-2">
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                )}
                <Button
                  onClick={goNext}
                  disabled={step === 2 && enabledDays.size === 0}
                  className={cn("h-12 rounded-xl font-bold gap-2 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90", canBack ? "flex-1" : "w-full")}
                >
                  {step === 3 && dayIndex < activeDaysList.length - 1
                    ? `Siguiente dia: ${activeDaysList[dayIndex + 1]?.full}`
                    : "Siguiente"
                  }
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 text-base font-bold gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar mis horarios
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
