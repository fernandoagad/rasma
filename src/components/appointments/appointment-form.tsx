"use client";

import { useActionState } from "react";
import { createAppointment } from "@/actions/appointments";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  User,
  Users,
  Video,
  MapPin,
  Repeat,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { toast } from "sonner";

interface Props {
  therapists: { id: string; name: string; email: string }[];
  patients: { id: string; firstName: string; lastName: string; rut: string | null }[];
  userId: string;
  userRole: string;
  defaultDate?: string;
}

const SESSION_TYPES = [
  { value: "individual", label: "Individual", icon: User },
  { value: "pareja", label: "Pareja", icon: Users },
  { value: "familiar", label: "Familiar", icon: Users },
  { value: "grupal", label: "Grupal", icon: Users },
  { value: "evaluacion", label: "Evaluacion", icon: User },
];

const DURATION_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "50", label: "50 min" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1.5 horas" },
  { value: "120", label: "2 horas" },
];

const DAY_NAMES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const MORNING_TIMES = [
  "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30",
];

const AFTERNOON_TIMES = [
  "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30",
];

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday=0

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  for (let i = 0; i < startDow; i++) currentWeek.push(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentWeek.push(new Date(year, month, d));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return weeks;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function AppointmentForm({ therapists, patients, userId, userRole, defaultDate }: Props) {
  const [state, action, pending] = useActionState(createAppointment, undefined);
  const router = useRouter();

  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [therapistId, setTherapistId] = useState(userRole === "terapeuta" ? userId : "");
  const [modality, setModality] = useState("presencial");
  const [sessionType, setSessionType] = useState("individual");
  const [duration, setDuration] = useState("50");
  const [isRecurring, setIsRecurring] = useState(false);
  const [showPatientList, setShowPatientList] = useState(false);

  // Date/time picker state
  const defaultParsed = defaultDate ? new Date(defaultDate) : null;
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    defaultParsed && !isNaN(defaultParsed.getTime()) ? defaultParsed : null
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    defaultParsed && !isNaN(defaultParsed.getTime())
      ? `${String(defaultParsed.getHours()).padStart(2, "0")}:${String(defaultParsed.getMinutes()).padStart(2, "0")}`
      : ""
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = defaultParsed && !isNaN(defaultParsed.getTime()) ? defaultParsed : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Combine date + time into datetime-local format for hidden input
  const dateTimeValue = useMemo(() => {
    if (!selectedDate || !selectedTime) return "";
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}T${selectedTime}`;
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    if (state?.success) {
      if (state.warning) {
        toast.warning(state.warning);
      }
      router.push("/citas");
    }
  }, [state?.success, state?.warning, router]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients;
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        (p.rut && p.rut.toLowerCase().includes(q))
    );
  }, [patients, patientSearch]);

  const selectedPatient = patients.find((p) => p.id === patientId);

  const today = new Date();
  const monthGrid = useMemo(
    () => getMonthGrid(calendarMonth.year, calendarMonth.month),
    [calendarMonth.year, calendarMonth.month]
  );

  const monthLabel = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    setCalendarMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const nextMonth = () => {
    setCalendarMonth((prev) => {
      const d = new Date(prev.year, prev.month + 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <form action={action} className="space-y-6">
      {/* Hidden fields for form submission */}
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="therapistId" value={therapistId} />
      <input type="hidden" name="modality" value={modality} />
      <input type="hidden" name="sessionType" value={sessionType} />
      <input type="hidden" name="durationMinutes" value={duration} />
      <input type="hidden" name="dateTime" value={dateTimeValue} />

      {/* Step 1: Patient */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">1</div>
            <h3 className="font-semibold text-sm">Paciente</h3>
          </div>

          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-rasma-teal/5 border-rasma-teal/20">
              <div className="flex items-center gap-3">
                <AvatarInitials name={`${selectedPatient.firstName} ${selectedPatient.lastName}`} size="sm" />
                <div>
                  <p className="text-sm font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                  {selectedPatient.rut && (
                    <p className="text-xs text-muted-foreground">{selectedPatient.rut}</p>
                  )}
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setPatientId(""); setPatientSearch(""); }}>
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente por nombre o RUT..."
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setShowPatientList(true); }}
                  onFocus={() => setShowPatientList(true)}
                  className="pl-9"
                />
              </div>
              {showPatientList && (
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                  {filteredPatients.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">No se encontraron pacientes</p>
                  ) : (
                    filteredPatients.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setPatientId(p.id); setShowPatientList(false); setPatientSearch(""); }}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors text-left"
                      >
                        <AvatarInitials name={`${p.firstName} ${p.lastName}`} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{p.lastName}, {p.firstName}</p>
                          {p.rut && <p className="text-xs text-muted-foreground">{p.rut}</p>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Therapist & Type */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">2</div>
            <h3 className="font-semibold text-sm">
              {userRole === "terapeuta" ? "Tipo de sesion" : "Terapeuta y tipo de sesion"}
            </h3>
          </div>

          <div className="space-y-4">
            {userRole === "terapeuta" ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <AvatarInitials name={therapists.find(t => t.id === userId)?.name || "Terapeuta"} size="sm" />
                <div>
                  <p className="text-xs text-muted-foreground">Terapeuta asignado</p>
                  <p className="text-sm font-medium">{therapists.find(t => t.id === userId)?.name || "Usted"}</p>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5">Terapeuta</Label>
                <Select value={therapistId} onValueChange={setTherapistId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar terapeuta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {therapists.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Tipo de sesion</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SESSION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSessionType(type.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all",
                      sessionType === type.value
                        ? "border-rasma-teal bg-rasma-teal/10 text-rasma-dark"
                        : "border-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <type.icon className="h-4 w-4" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Date, Time & Duration */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">3</div>
            <h3 className="font-semibold text-sm">Fecha y hora</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
            {/* Left: Calendar + Time Picker */}
            <div className="space-y-4">
              {/* Mini calendar */}
              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between mb-3">
                  <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold capitalize">{monthLabel}</span>
                  <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {monthGrid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-0.5">
                    {week.map((date, di) => {
                      if (!date) {
                        return <div key={di} className="h-8" />;
                      }
                      const past = isPastDate(date);
                      const isToday = isSameDay(date, today);
                      const isSelected = selectedDate && isSameDay(date, selectedDate);

                      return (
                        <button
                          key={di}
                          type="button"
                          disabled={past}
                          onClick={() => setSelectedDate(date)}
                          className={cn(
                            "h-8 w-full rounded-md text-xs font-medium transition-all",
                            past && "text-muted-foreground/30 cursor-not-allowed",
                            !past && !isSelected && "hover:bg-muted",
                            isToday && !isSelected && "text-rasma-teal font-bold",
                            isSelected && "bg-rasma-dark text-rasma-lime"
                          )}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Time slot grid */}
              {selectedDate && (
                <div className="rounded-xl border p-3 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {selectedDate.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5">Mañana</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MORNING_TIMES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "py-1.5 px-2 rounded-md border text-xs font-medium transition-all text-center",
                            selectedTime === t
                              ? "border-rasma-teal bg-rasma-teal/10 text-rasma-dark"
                              : "border-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5">Tarde</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {AFTERNOON_TIMES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "py-1.5 px-2 rounded-md border text-xs font-medium transition-all text-center",
                            selectedTime === t
                              ? "border-rasma-teal bg-rasma-teal/10 text-rasma-dark"
                              : "border-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Duration */}
            <div className="lg:w-48">
              <Label className="text-xs text-muted-foreground mb-1.5">
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                Duracion
              </Label>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    className={cn(
                      "py-2 px-3 rounded-md border text-xs font-medium transition-all text-center",
                      duration === opt.value
                        ? "border-rasma-teal bg-rasma-teal/10 text-rasma-dark"
                        : "border-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected summary */}
          {selectedDate && selectedTime && (
            <div className="mt-4 p-3 rounded-lg bg-rasma-teal/5 border border-rasma-teal/20">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-rasma-teal" />
                <p className="text-sm font-medium">
                  {selectedDate.toLocaleDateString("es-CL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  a las {selectedTime} — {DURATION_OPTIONS.find((o) => o.value === duration)?.label}
                </p>
              </div>
            </div>
          )}

          {/* Recurring toggle */}
          <div className="flex items-center justify-between mt-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Cita recurrente</p>
                <p className="text-xs text-muted-foreground">Repetir semanalmente</p>
              </div>
            </div>
            <Switch
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {isRecurring && (
            <div className="mt-3 pl-9">
              <Label className="text-xs text-muted-foreground mb-1.5">Repetir por</Label>
              <Select defaultValue="4">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 4, 6, 8, 10, 12].map((w) => (
                    <SelectItem key={w} value={String(w)}>{w} semanas</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 4: Modality */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">4</div>
            <h3 className="font-semibold text-sm">Modalidad</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setModality("presencial")}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                modality === "presencial"
                  ? "border-rasma-green bg-rasma-green/5"
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-10 w-10 rounded-full",
                modality === "presencial" ? "bg-rasma-green/15 text-rasma-green" : "bg-muted text-muted-foreground"
              )}>
                <MapPin className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Presencial</p>
                <p className="text-xs text-muted-foreground">En consultorio</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setModality("online")}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                modality === "online"
                  ? "border-rasma-teal bg-rasma-teal/5"
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-10 w-10 rounded-full",
                modality === "online" ? "bg-rasma-teal/15 text-rasma-teal" : "bg-muted text-muted-foreground"
              )}>
                <Video className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Online</p>
                <p className="text-xs text-muted-foreground">Google Meet</p>
              </div>
            </button>
          </div>

          {modality === "presencial" && (
            <div className="mt-4">
              <Label className="text-xs text-muted-foreground mb-1.5">Ubicacion (opcional)</Label>
              <Input name="location" placeholder="Ej: Consultorio 3, Av. Providencia 1234" />
            </div>
          )}

          {modality === "online" && (
            <div className="mt-4 p-3 rounded-lg bg-rasma-teal/5 border border-rasma-teal/20">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-rasma-teal" />
                <p className="text-sm text-rasma-dark font-medium">Link de Google Meet se generara automaticamente</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Se creara un evento en Google Calendar con enlace de reunion al guardar la cita.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 5: Price */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">5</div>
            <h3 className="font-semibold text-sm">Valor de la sesion (opcional)</h3>
          </div>
          <div className="max-w-xs">
            <Label className="text-xs text-muted-foreground mb-1.5">Precio en CLP</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                name="price"
                type="number"
                min="0"
                step="1000"
                placeholder="Ej: 35000"
                className="pl-7"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Se usara para generar el cobro correspondiente</p>
          </div>
        </CardContent>
      </Card>

      {/* Step 6: Notes */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">6</div>
            <h3 className="font-semibold text-sm">Notas (opcional)</h3>
          </div>
          <Textarea
            name="notes"
            rows={3}
            placeholder="Motivo de consulta, instrucciones especiales..."
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Error */}
      {state?.error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || !patientId || !therapistId || !dateTimeValue}
          className="flex-1 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando cita...
            </>
          ) : (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Crear Cita
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
