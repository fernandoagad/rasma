"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UI } from "@/constants/ui";
import { toast } from "sonner";
import { addCareTeamMember } from "@/actions/care-teams";

interface Therapist {
  id: string;
  name: string;
}

interface PatientData {
  id?: string;
  firstName: string;
  lastName: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  referralSource: string | null;
  notes: string | null;
  primaryTherapistId: string | null;
  status: string;
  type?: string;
}

interface PatientFormProps {
  patient?: PatientData | null;
  therapists: Therapist[];
  action: (
    prevState: { error?: string; success?: boolean; id?: string } | undefined,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean; id?: string }>;
  isEdit?: boolean;
}

export function PatientForm({
  patient,
  therapists,
  action,
  isEdit = false,
}: PatientFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<Set<string>>(new Set());

  const toggleTeamMember = (id: string) => {
    setTeamMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (state?.success) {
      // If creating a new patient and team members selected, assign them
      if (!isEdit && state.id && teamMembers.size > 0) {
        Promise.all(
          Array.from(teamMembers).map((userId) =>
            addCareTeamMember(state.id!, userId)
          )
        ).then(() => {
          toast.success(UI.patients.created);
          router.push(`/pacientes/${state.id}`);
          router.refresh();
        });
      } else {
        toast.success(isEdit ? UI.patients.updated : UI.patients.created);
        router.push(state.id ? `/pacientes/${state.id}` : "/pacientes");
        router.refresh();
      }
    }
  }, [state, isEdit, router, teamMembers]);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg bg-rasma-red/10 border border-rasma-red/20 p-3 text-sm text-rasma-red">
          {state.error}
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">{UI.patients.firstName} *</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={patient?.firstName || ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{UI.patients.lastName} *</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={patient?.lastName || ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rut">{UI.patients.rut}</Label>
            <Input
              id="rut"
              name="rut"
              defaultValue={patient?.rut || ""}
              placeholder="12.345.678-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">{UI.patients.dateOfBirth}</Label>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={patient?.dateOfBirth || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">{UI.patients.gender}</Label>
            <Select name="gender" defaultValue={patient?.gender || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(UI.patients.genders).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">{UI.patients.status}</Label>
            <Select name="status" defaultValue={patient?.status || "activo"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(UI.patients.statuses).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Paciente</Label>
            <Select name="type" defaultValue={patient?.type || "fundacion"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(UI.patients.types).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">{UI.patients.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={patient?.email || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{UI.patients.phone}</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={patient?.phone || ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">{UI.patients.address}</Label>
            <Input
              id="address"
              name="address"
              defaultValue={patient?.address || ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>{UI.patients.emergencyContact}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">
              {UI.patients.emergencyContactName}
            </Label>
            <Input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={patient?.emergencyContactName || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">
              {UI.patients.emergencyContactPhone}
            </Label>
            <Input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              defaultValue={patient?.emergencyContactPhone || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactRelation">
              {UI.patients.emergencyContactRelation}
            </Label>
            <Input
              id="emergencyContactRelation"
              name="emergencyContactRelation"
              defaultValue={patient?.emergencyContactRelation || ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Clinical */}
      <Card>
        <CardHeader>
          <CardTitle>Información Clínica</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primaryTherapistId">{UI.patients.therapist}</Label>
            <Select
              name="primaryTherapistId"
              defaultValue={patient?.primaryTherapistId || ""}
            >
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="referralSource">{UI.patients.referralSource}</Label>
            <Input
              id="referralSource"
              name="referralSource"
              defaultValue={patient?.referralSource || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceProvider">{UI.patients.insurance}</Label>
            <Input
              id="insuranceProvider"
              name="insuranceProvider"
              defaultValue={patient?.insuranceProvider || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceNumber">
              {UI.patients.insuranceNumber}
            </Label>
            <Input
              id="insuranceNumber"
              name="insuranceNumber"
              defaultValue={patient?.insuranceNumber || ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">{UI.patients.notes}</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={patient?.notes || ""}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Care Team Assignment (only on create) */}
      {!isEdit && therapists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipo de Atención</CardTitle>
            <p className="text-sm text-muted-foreground">
              Seleccione los profesionales que formarán parte del equipo de atención de este paciente
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {therapists.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={teamMembers.has(t.id)}
                    onCheckedChange={() => toggleTeamMember(t.id)}
                  />
                  <span className="text-sm">{t.name}</span>
                </label>
              ))}
            </div>
            {teamMembers.size > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {teamMembers.size} profesional(es) seleccionado(s)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          {UI.common.cancel}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? UI.common.loading : UI.common.save}
        </Button>
      </div>
    </form>
  );
}
