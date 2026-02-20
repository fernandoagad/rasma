"use client";

import { useActionState } from "react";
import { createSessionNote } from "@/actions/notes";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  FileText,
  Search,
  Shield,
  Loader2,
  Stethoscope,
  Eye,
  Brain,
  ClipboardList,
} from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  dateTime: Date;
  patient: { id: string; firstName: string; lastName: string };
}

interface Props {
  appointments: Appointment[];
  preselectedId?: string;
}

const SOAP_SECTIONS = [
  {
    key: "subjective",
    label: "Subjetivo (S)",
    icon: Stethoscope,
    placeholder: "Lo que el paciente reporta: sintomas, quejas, historia personal, preocupaciones, cambios desde la ultima sesion...",
    description: "Relato del paciente en sus propias palabras",
    color: "blue",
  },
  {
    key: "objective",
    label: "Objetivo (O)",
    icon: Eye,
    placeholder: "Observaciones clinicas: conducta observada, estado emocional, lenguaje corporal, resultados de pruebas, contacto visual...",
    description: "Observaciones directas del terapeuta",
    color: "green",
  },
  {
    key: "assessment",
    label: "Evaluacion (A)",
    icon: Brain,
    placeholder: "Analisis clinico: diagnostico, interpretacion, progreso respecto a objetivos, patrones identificados, nivel de funcionamiento...",
    description: "Analisis e interpretacion clinica",
    color: "purple",
  },
  {
    key: "plan",
    label: "Plan (P)",
    icon: ClipboardList,
    placeholder: "Proximos pasos: intervenciones planificadas, tareas para el paciente, frecuencia de sesiones, derivaciones, ajustes al plan de tratamiento...",
    description: "Plan de accion y proximos pasos",
    color: "orange",
  },
];

const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
  blue: { bg: "bg-blue-100", icon: "text-blue-600", border: "border-blue-200 focus-within:border-blue-400" },
  green: { bg: "bg-green-100", icon: "text-green-600", border: "border-green-200 focus-within:border-green-400" },
  purple: { bg: "bg-purple-100", icon: "text-purple-600", border: "border-purple-200 focus-within:border-purple-400" },
  orange: { bg: "bg-orange-100", icon: "text-orange-600", border: "border-orange-200 focus-within:border-orange-400" },
};

export function NoteForm({ appointments, preselectedId }: Props) {
  const [state, action, pending] = useActionState(createSessionNote, undefined);
  const router = useRouter();

  const [selectedId, setSelectedId] = useState(preselectedId || "");
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(!preselectedId);

  useEffect(() => {
    if (state?.success) router.push("/notas");
  }, [state?.success, router]);

  const filtered = useMemo(() => {
    if (!search) return appointments;
    const q = search.toLowerCase();
    return appointments.filter((a) =>
      `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase().includes(q)
    );
  }, [appointments, search]);

  const selectedAppt = appointments.find((a) => a.id === selectedId);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="appointmentId" value={selectedId} />

      {/* Step 1: Select Appointment */}
      <Card>
        <CardContent className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">1</div>
            <h3 className="font-semibold text-sm">Seleccionar cita completada</h3>
            <span className="text-xs text-muted-foreground ml-auto">{appointments.length} pendiente{appointments.length !== 1 ? "s" : ""}</span>
          </div>

          {selectedAppt ? (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-rasma-teal/5 border-rasma-teal/20">
              <div className="flex items-center gap-3">
                <AvatarInitials name={`${selectedAppt.patient.firstName} ${selectedAppt.patient.lastName}`} size="sm" />
                <div>
                  <p className="text-sm font-medium">
                    {selectedAppt.patient.firstName} {selectedAppt.patient.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(selectedAppt.dateTime).toLocaleDateString("es-CL", {
                      weekday: "long", day: "numeric", month: "long"
                    })}
                    {" \u2014 "}
                    {new Date(selectedAppt.dateTime).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedId(""); setShowList(true); }}>
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar paciente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              {showList && (
                <div className="border rounded-lg max-h-52 overflow-y-auto divide-y">
                  {filtered.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">
                      {appointments.length === 0
                        ? "No hay citas completadas sin nota clinica"
                        : "No se encontraron resultados"
                      }
                    </p>
                  ) : (
                    filtered.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setSelectedId(a.id); setShowList(false); }}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors text-left"
                      >
                        <AvatarInitials name={`${a.patient.firstName} ${a.patient.lastName}`} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{a.patient.firstName} {a.patient.lastName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.dateTime).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                            {" \u2014 "}
                            {new Date(a.dateTime).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                          </p>
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

      {/* Step 2: SOAP Sections */}
      <Card>
        <CardContent className="pt-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">2</div>
            <h3 className="font-semibold text-sm">Nota SOAP</h3>
          </div>
          <div className="flex items-center gap-1.5 mb-5 ml-8">
            <Shield className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xs text-muted-foreground">Contenido encriptado AES-256-GCM</p>
          </div>

          <div className="space-y-4">
            {SOAP_SECTIONS.map((section) => {
              const colors = colorClasses[section.color];
              return (
                <div key={section.key} className={cn("rounded-xl border p-4 transition-colors", colors.border)}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("flex items-center justify-center h-7 w-7 rounded-lg", colors.bg)}>
                      <section.icon className={cn("h-4 w-4", colors.icon)} />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">{section.label}</Label>
                      <p className="text-[10px] text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <Textarea
                    name={section.key}
                    rows={4}
                    placeholder={section.placeholder}
                    className="resize-none border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none text-sm"
                  />
                </div>
              );
            })}
          </div>
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
          disabled={pending || !selectedId}
          className="flex-1 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando nota...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Guardar nota encriptada
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
