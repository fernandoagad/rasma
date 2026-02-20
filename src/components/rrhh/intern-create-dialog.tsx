"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInternFromApplicant } from "@/actions/interns";
import { UI } from "@/constants/ui";

interface StaffOption {
  id: string;
  name: string;
  specialty: string | null;
  role: string;
}

export function InternCreateDialog({
  open,
  onOpenChange,
  applicantId,
  applicantName,
  staffList,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  applicantName: string;
  staffList: StaffOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [university, setUniversity] = useState("");
  const [program, setProgram] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("20");

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      const result = await createInternFromApplicant(applicantId, {
        university,
        program,
        supervisorId,
        startDate,
        endDate: endDate || undefined,
        weeklyHours: parseInt(weeklyHours) || 20,
      });
      if (result.error) {
        setError(result.error);
      } else if (result.internId) {
        onOpenChange(false);
        router.push(`/rrhh/pasantias/${result.internId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear perfil de pasantía</DialogTitle>
          <DialogDescription>
            Crear un perfil de pasantía para {applicantName}. Se enviará un correo de aceptación automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label>Universidad</Label>
            <Input
              placeholder="Ej: Universidad de Chile"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Programa</Label>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar programa" />
              </SelectTrigger>
              <SelectContent>
                {UI.rrhh.internPrograms.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Supervisor/a</Label>
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar supervisor/a" />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.specialty ? ` — ${s.specialty}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de término (opcional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Horas semanales</Label>
            <Input
              type="number"
              min="1"
              max="45"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !university || !program || !supervisorId || !startDate}
          >
            {isPending ? "Creando..." : "Crear pasantía"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
