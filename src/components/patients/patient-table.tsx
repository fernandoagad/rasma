"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Eye, Pencil, Users, CalendarCheck, ClipboardList, UserMinus, Trash2 } from "lucide-react";
import { UI } from "@/constants/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { bulkUpdatePatientStatus, bulkUpdatePatientTherapist, deletePatient } from "@/actions/patients";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  status: "activo" | "inactivo" | "alta";
  type?: "fundacion" | "externo";
  primaryTherapist: { id: string; name: string } | null;
  teamCount?: number;
  activePlans?: number;
  nextAppointment?: string | null;
  completedSessions?: number;
}

interface Therapist {
  id: string;
  name: string;
  specialty: string | null;
  image: string | null;
}

function formatShortDate(raw: string): string {
  const d = new Date(raw);
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export function PatientTable({ patients, therapists = [], userRole }: { patients: Patient[]; therapists?: Therapist[]; userRole?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const allSelected = patients.length > 0 && selectedIds.size === patients.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < patients.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(patients.map((p) => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = (status: string) => {
    startTransition(async () => {
      const result = await bulkUpdatePatientStatus(
        Array.from(selectedIds),
        status as "activo" | "inactivo" | "alta"
      );
      if ("success" in result) {
        toast.success(`${result.count} ${UI.bulk.bulkSuccess}`);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleBulkTherapist = (therapistId: string | null) => {
    startTransition(async () => {
      const result = await bulkUpdatePatientTherapist(
        Array.from(selectedIds),
        therapistId
      );
      if ("success" in result) {
        toast.success(`${result.count} ${UI.bulk.bulkSuccess}`);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  if (patients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={UI.patients.noPatients}
        description="Agregue un nuevo paciente para comenzar."
      />
    );
  }

  const hasEnriched = patients[0]?.teamCount !== undefined;

  return (
    <div className="space-y-3">
      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rasma-teal/30 bg-rasma-teal/5 px-4 py-2.5 flex-wrap">
          <span className="text-sm font-medium">
            {selectedIds.size} {UI.bulk.selected}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={isPending}>
                  {UI.bulk.changeStatus}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(UI.patients.statuses).map(([key, label]) => (
                  <DropdownMenuItem key={key} onClick={() => handleBulkStatus(key)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Therapist dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={isPending}>
                  {UI.bulk.assignTherapist}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                <DropdownMenuItem onClick={() => handleBulkTherapist(null)}>
                  <UserMinus className="h-4 w-4 mr-2 text-muted-foreground" />
                  {UI.bulk.noTherapist}
                </DropdownMenuItem>
                {therapists.length > 0 && <DropdownMenuSeparator />}
                {therapists.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => handleBulkTherapist(t.id)}>
                    {t.name}
                    {t.specialty && <span className="ml-1 text-xs text-muted-foreground">({t.specialty})</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={isPending}>
              {UI.bulk.deselect}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as unknown as HTMLButtonElement).dataset.state = someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked";
                    }
                  }}
                  onCheckedChange={toggleAll}
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Paciente
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {UI.patients.rut}
              </TableHead>
              <TableHead className="hidden lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Terapeuta
              </TableHead>
              {hasEnriched && (
                <>
                  <TableHead className="hidden xl:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Equipo
                  </TableHead>
                  <TableHead className="hidden xl:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Plan
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Próxima
                  </TableHead>
                  <TableHead className="hidden xl:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sesiones
                  </TableHead>
                </>
              )}
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => {
              const fullName = `${patient.firstName} ${patient.lastName}`;
              const isSelected = selectedIds.has(patient.id);
              return (
                <TableRow
                  key={patient.id}
                  className={cn(
                    "transition-colors",
                    isSelected && "bg-rasma-teal/5 border-l-2 border-l-rasma-teal"
                  )}
                >
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(patient.id)}
                      aria-label={`Seleccionar ${fullName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={`/pacientes/${patient.id}`} className="flex items-center gap-2.5 group">
                      <AvatarInitials name={fullName} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm group-hover:text-rasma-teal transition-colors truncate">
                          {fullName}
                          {patient.type === "externo" && (
                            <Badge variant="info" className="ml-1.5 text-[9px] px-1 py-0">Externo</Badge>
                          )}
                        </p>
                        {patient.email && (
                          <p className="text-[11px] text-muted-foreground truncate">{patient.email}</p>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {patient.rut || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {patient.primaryTherapist?.name || "—"}
                  </TableCell>
                  {hasEnriched && (
                    <>
                      <TableCell className="hidden xl:table-cell">
                        {(patient.teamCount ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {patient.teamCount}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {(patient.activePlans ?? 0) > 0 ? (
                          <Badge variant="success" className="text-[10px] px-1.5">Activo</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {patient.nextAppointment ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarCheck className="h-3 w-3 text-rasma-teal" />
                            {formatShortDate(patient.nextAppointment)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground tabular-nums">
                        {(patient.completedSessions ?? 0) > 0 ? patient.completedSessions : "—"}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <StatusBadge type="patient" status={patient.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/pacientes/${patient.id}`} className="flex items-center gap-2">
                            <Eye className="h-4 w-4" /> Ver
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/pacientes/${patient.id}/editar`} className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        {userRole === "admin" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(patient)}
                              className="text-rasma-red focus:text-rasma-red cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> {UI.common.delete}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete patient confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{UI.common.confirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {UI.patients.confirmDelete}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{UI.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                startTransition(async () => {
                  const result = await deletePatient(deleteTarget.id);
                  if ("success" in result) {
                    toast.success(UI.patients.deleted);
                    router.refresh();
                  } else {
                    toast.error(result.error);
                  }
                  setDeleteTarget(null);
                });
              }}
            >
              {UI.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
