"use client";

import { useActionState } from "react";
import { updateAppointment } from "@/actions/appointments";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { toast } from "sonner";
import { formatChileTime, CHILE_TZ } from "@/lib/timezone";

interface AppointmentData {
  id: string;
  patientId: string;
  therapistId: string;
  dateTime: string; // ISO string
  durationMinutes: number;
  status: string;
  sessionType: string;
  modality: string;
  location: string | null;
  meetingLink: string | null;
  notes: string | null;
  price: number | null;
  patient: { id: string; firstName: string; lastName: string };
  therapist: { id: string; name: string };
}

interface Props {
  appointment: AppointmentData;
  therapists: { id: string; name: string; email: string }[];
  patients: { id: string; firstName: string; lastName: string; rut: string | null }[];
  userId: string;
  userRole: string;
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
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

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

export function AppointmentEditForm({ appointment, therapists, patients, userId, userRole }: Props) {
  const updateWithId = updateAppointment.bind(null, appointment.id);
  const [state, action, pending] = useActionState(updateWithId, undefined);
  const router = useRouter();

  // Parse existing dateTime in Chile timezone for defaults
  const existingDt = new Date(appointment.dateTime);
  const existingChileTime = formatChileTime(existingDt);

  // Extract Chile-local date components for the calendar picker
  const chileParts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(existingDt);
  const getP = (t: string) => Number(chileParts.find((p) => p.type === t)?.value || 0);
  const initialDate = new Date(getP("year"), getP("month") - 1, getP("day"));

  const [patientId, setPatientId] = useState(appointment.patientId);
  const [patientSearch, setPatientSearch] = useState("");
  const [therapistId, setTherapistId] = useState(appointment.therapistId);
  const [modality, setModality] = useState(appointment.modality);
  const [sessionType, setSessionType] = useState(appointment.sessionType);
  const [duration, setDuration] = useState(String(appointment.durationMinutes));
  const [showPatientList, setShowPatientList] = useState(false);

  // Date/time picker state
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string>(existingChileTime);
  const [calendarMonth, setCalendarMonth] = useState({
    year: initialDate.getFullYear(),
    month: initialDate.getMonth(),
  });

  // Combine date + time into datetime-local format
  const dateTimeValue = useMemo(() => {
    if (!selectedDate || !selectedTime) return "";
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}T${selectedTime}`;
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    if (state?.success) {
      toast.success("Cita actualizada correctamente");
      router.push(`/citas/${appointment.id}`);
    }
  }, [state?.success, router, appointment.id]);

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
      {/* Hidden fields */}
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="therapistId" value={therapistId} />
      <input type="hidden" name="modality" value={modality} />
      <input type="hidden" name="sessionType" value={sessionType} />
      <input type="hidden" name="durationMinutes" value={duration} />
      <input type="hidden" name="dateTime" value={dateTimeValue} />

      {/* Patient */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-rasma-dark text-rasma-lime text-sm font-bold">1</div>
            <h3 className="font-bold text-base">Paciente</h3>
          </div>

          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 rounded-xl border bg-zinc-50 border-border">
              <div className="flex items-center gap-3">
                <AvatarInitials name={`${selectedPatient.firstName} ${selectedPatient.lastName}`} size="sm" />
                <div>
                  <p className="text-sm font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                  {selectedPatient.rut && <p className="text-xs text-muted-foreground">{selectedPatient.rut}</p>}
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
                <div className="border rounded-xl max-h-48 overflow-y-auto divide-y">
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

      {/* Therapist & Session Type */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-rasma-dark text-rasma-lime text-sm font-bold">2</div>
            <h3 className="font-bold text-base">
              {userRole === "terapeuta" ? "Tipo de sesion" : "Terapeuta y tipo de sesion"}
            </h3>
          </div>

          <div className="space-y-4">
            {userRole === "terapeuta" ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                <AvatarInitials name={therapists.find((t) => t.id === userId)?.name || "Terapeuta"} size="sm" />
                <div>
                  <p className="text-xs text-muted-foreground">Terapeuta asignado</p>
                  <p className="text-sm font-medium">{therapists.find((t) => t.id === userId)?.name || "Usted"}</p>
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
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all",
                      sessionType === type.value
                        ? "border-rasma-dark bg-rasma-dark text-white"
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

      {/* Date, Time & Duration */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-rasma-dark text-rasma-lime text-sm font-bold">3</div>
            <h3 className="font-bold text-base">Fecha y hora</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
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
                    <div key={d} className="text-center text-xs font-bold text-muted-foreground py-1">{d}</div>
                  ))}
                </div>

                {monthGrid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-0.5">
                    {week.map((date, di) => {
                      if (!date) return <div key={di} className="h-8" />;
                      const isToday = isSameDay(date, today);
                      const isSelected = selectedDate && isSameDay(date, selectedDate);

                      return (
                        <button
                          key={di}
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          className={cn(
                            "h-8 w-full rounded-md text-xs font-medium transition-all",
                            !isSelected && "hover:bg-muted",
                            isToday && !isSelected && "text-rasma-dark font-bold",
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
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Mañana</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MORNING_TIMES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "py-1.5 px-2 rounded-xl border text-xs font-medium transition-all text-center",
                            selectedTime === t
                              ? "border-rasma-dark bg-rasma-dark text-white"
                              : "border-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Tarde</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {AFTERNOON_TIMES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "py-1.5 px-2 rounded-xl border text-xs font-medium transition-all text-center",
                            selectedTime === t
                              ? "border-rasma-dark bg-rasma-dark text-white"
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

            {/* Duration */}
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
                      "py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center",
                      duration === opt.value
                        ? "border-rasma-dark bg-rasma-dark text-white"
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
            <div className="mt-4 p-4 rounded-xl bg-rasma-dark text-white">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-rasma-lime" />
                <p className="text-sm font-semibold">
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
        </CardContent>
      </Card>

      {/* Modality */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-rasma-dark text-rasma-lime text-sm font-bold">4</div>
            <h3 className="font-bold text-base">Modalidad</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setModality("presencial")}
              className={cn(
                "flex items-center gap-3 p-5 rounded-xl border-2 transition-all",
                modality === "presencial"
                  ? "border-rasma-dark bg-rasma-dark text-white"
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-11 w-11 rounded-full",
                modality === "presencial" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
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
                "flex items-center gap-3 p-5 rounded-xl border-2 transition-all",
                modality === "online"
                  ? "border-rasma-dark bg-rasma-dark text-white"
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-11 w-11 rounded-full",
                modality === "online" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
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
              <Input name="location" placeholder="Ej: Consultorio 3, Av. Providencia 1234" defaultValue={appointment.location || ""} />
            </div>
          )}

          {modality === "online" && appointment.meetingLink && (
            <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-border">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-rasma-dark" />
                <p className="text-sm text-rasma-dark font-medium">Link de Google Meet existente</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6 truncate">{appointment.meetingLink}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-rasma-dark text-rasma-lime text-sm font-bold">5</div>
            <h3 className="font-bold text-base">Valor de la sesion (opcional)</h3>
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
                defaultValue={appointment.price || ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-rasma-dark text-rasma-lime text-sm font-bold">6</div>
            <h3 className="font-bold text-base">Notas (opcional)</h3>
          </div>
          <Textarea
            name="notes"
            rows={3}
            placeholder="Motivo de consulta, instrucciones especiales..."
            className="resize-none"
            defaultValue={appointment.notes || ""}
          />
        </CardContent>
      </Card>

      {/* Error */}
      {state?.error && (
        <div className="p-3 rounded-xl border border-rasma-dark bg-zinc-50 text-sm text-rasma-dark">
          {state.error}
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12 text-base font-semibold rounded-xl"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || !patientId || !therapistId || !dateTimeValue}
          className="flex-1 h-12 text-base font-bold rounded-xl bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
