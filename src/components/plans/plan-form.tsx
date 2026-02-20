"use client";

import { useActionState } from "react";
import { createTreatmentPlan } from "@/actions/plans";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Search,
  Loader2,
  Target,
  Stethoscope,
  Lightbulb,
  ClipboardList,
} from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { cn } from "@/lib/utils";

interface Props {
  patients: { id: string; firstName: string; lastName: string; rut: string | null }[];
}

export function PlanForm({ patients }: Props) {
  const [state, action, pending] = useActionState(createTreatmentPlan, undefined);
  const router = useRouter();

  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientList, setShowPatientList] = useState(false);

  useEffect(() => {
    if (state?.success) router.push("/planes");
  }, [state?.success, router]);

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

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="patientId" value={patientId} />

      {/* Step 1: Patient */}
      <Card>
        <CardContent className="pt-2">
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

      {/* Step 2: Diagnosis */}
      <Card>
        <CardContent className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">2</div>
            <h3 className="font-semibold text-sm">Diagnostico</h3>
          </div>

          <div className="rounded-xl border p-4 border-red-200 focus-within:border-red-400 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-red-100">
                <Stethoscope className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Diagnostico clinico</Label>
                <p className="text-[10px] text-muted-foreground">Diagnostico principal y comorbilidades</p>
              </div>
            </div>
            <Textarea
              name="diagnosis"
              rows={3}
              placeholder="TEA nivel 1, TDAH tipo combinado, trastorno de ansiedad..."
              className="resize-none border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Goals & Interventions */}
      <Card>
        <CardContent className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">3</div>
            <h3 className="font-semibold text-sm">Objetivos e Intervenciones</h3>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border p-4 border-blue-200 focus-within:border-blue-400 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Objetivos terapeuticos</Label>
                  <p className="text-[10px] text-muted-foreground">Metas a corto y largo plazo</p>
                </div>
              </div>
              <Textarea
                name="goals"
                rows={4}
                placeholder="1. Mejorar habilidades de comunicacion social&#10;2. Reducir conductas repetitivas&#10;3. Desarrollar autonomia en actividades diarias&#10;4. Fortalecer regulacion emocional..."
                className="resize-none border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none text-sm"
              />
            </div>

            <div className="rounded-xl border p-4 border-green-200 focus-within:border-green-400 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-green-100">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Intervenciones planificadas</Label>
                  <p className="text-[10px] text-muted-foreground">Estrategias y tecnicas a utilizar</p>
                </div>
              </div>
              <Textarea
                name="interventions"
                rows={4}
                placeholder="- Terapia conductual aplicada (ABA)&#10;- Entrenamiento en habilidades sociales&#10;- Terapia de integracion sensorial&#10;- Psicoeducacion familiar..."
                className="resize-none border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Schedule */}
      <Card>
        <CardContent className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-rasma-dark text-rasma-lime text-xs font-bold">4</div>
            <h3 className="font-semibold text-sm">Fechas</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">
                <Calendar className="inline h-3.5 w-3.5 mr-1" />
                Fecha de inicio *
              </Label>
              <Input
                type="date"
                name="startDate"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">
                <Calendar className="inline h-3.5 w-3.5 mr-1" />
                Proxima revision
              </Label>
              <Input type="date" name="nextReviewDate" />
            </div>
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
          disabled={pending || !patientId}
          className="flex-1 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando plan...
            </>
          ) : (
            <>
              <ClipboardList className="mr-2 h-4 w-4" />
              Crear Plan de Tratamiento
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
