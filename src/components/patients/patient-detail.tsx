"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Pencil, Trash2, Phone, Mail, MapPin, User, Shield, Calendar, Clock,
  Video, MapPinIcon, CreditCard, FileText, Users2, UserPlus, X,
  ClipboardList, CheckCircle2, AlertTriangle, ArrowRight,
} from "lucide-react";
import { UI } from "@/constants/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePatient, getTherapists } from "@/actions/patients";
import { getCareTeamWithActivity, addCareTeamMember, removeCareTeamMember } from "@/actions/care-teams";
import { toast } from "sonner";
import { useState, useEffect, useTransition } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { PatientDocumentsTab } from "@/components/patients/patient-documents-tab";
import { AssignedProfessionals } from "@/components/patients/assigned-professionals";

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

interface Appointment {
  id: string;
  dateTime: Date;
  durationMinutes: number;
  status: string;
  sessionType: string;
  modality: string;
  therapistName: string;
  hasNote?: boolean;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  date: string;
}

interface Note {
  id: string;
  createdAt: Date;
  therapistName: string;
  appointmentDate: Date;
  appointmentId?: string;
  sessionType?: string;
  modality?: string;
}

interface PlanTask {
  id: string;
  title: string;
  completed: boolean;
  optional: boolean;
  sortOrder: number;
}

interface Plan {
  id: string;
  diagnosis: string | null;
  goals: string | null;
  status: string;
  startDate: string;
  nextReviewDate: string | null;
  therapist?: { id: string; name: string } | null;
  therapistName?: string;
  createdAt: Date;
  tasks?: PlanTask[];
}

interface PatientSummary {
  activePlans: number;
  latestDiagnosis: string | null;
  nextAppointment: { id: string; dateTime: Date; therapistName: string } | null;
  completedSessions: number;
  pendingNotes: number;
  teamCount: number;
  lastSession: { id: string; dateTime: Date; therapistName: string } | null;
}

interface PatientFile {
  id: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  category: string;
  label: string | null;
  driveViewLink: string | null;
  driveDownloadLink: string | null;
  uploadedBy: string;
  createdAt: Date;
}

interface PatientDetailProps {
  patient: {
    id: string;
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
    clinicalProfile?: string | null;
    program?: string | null;
    city?: string | null;
    status: string;
    createdAt: Date;
    primaryTherapist: { id: string; name: string } | null;
  };
  userRole: string;
  appointments?: Appointment[];
  payments?: Payment[];
  notes?: Note[];
  plans?: Plan[];
  summary?: PatientSummary;
  files?: PatientFile[];
}

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

const sessionTypeLabels: Record<string, string> = {
  individual: "Individual",
  pareja: "Pareja",
  familiar: "Familiar",
  grupal: "Grupal",
  evaluacion: "Evaluación",
};

export function PatientDetail({ patient, userRole, appointments = [], payments = [], notes = [], plans = [], summary, files = [] }: PatientDetailProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const canDelete = ["admin", "terapeuta"].includes(userRole);
  const canSeeNotes = ["admin", "terapeuta", "supervisor"].includes(userRole);
  const fullName = `${patient.firstName} ${patient.lastName}`;

  let clinicalProfile: { strengths?: string; objectives?: string; familySupport?: string; interests?: string } = {};
  if (patient.clinicalProfile) {
    try { clinicalProfile = JSON.parse(patient.clinicalProfile); } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deletePatient(patient.id);
    if (result.success) {
      toast.success(UI.patients.deleted);
      router.push("/pacientes");
    } else {
      toast.error(result.error);
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <AvatarInitials name={fullName} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-rasma-dark">{fullName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge type="patient" status={patient.status} />
              {patient.rut && <span className="text-sm text-muted-foreground">RUT: {patient.rut}</span>}
              {patient.city && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {patient.city}
                </span>
              )}
              {patient.program && <span className="text-sm text-muted-foreground">{patient.program}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/pacientes/${patient.id}/editar`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> {UI.common.edit}
            </Button>
          </Link>
          {canDelete && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" /> {UI.common.delete}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{UI.common.confirm}</DialogTitle>
                  <DialogDescription>{UI.patients.confirmDelete}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">{UI.common.cancel}</Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? UI.common.loading : UI.common.delete}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <SummaryCard
            label="Plan activo"
            value={summary.activePlans > 0 ? `${summary.activePlans}` : "—"}
            sub={summary.latestDiagnosis}
            color={summary.activePlans > 0 ? "text-emerald-600" : "text-muted-foreground"}
            icon={<ClipboardList className="h-3.5 w-3.5" />}
          />
          <SummaryCard
            label="Próxima cita"
            value={summary.nextAppointment
              ? new Date(summary.nextAppointment.dateTime).toLocaleDateString("es-CL", { day: "numeric", month: "short" })
              : "—"}
            sub={summary.nextAppointment?.therapistName}
            color={summary.nextAppointment ? "text-blue-600" : "text-muted-foreground"}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
          <SummaryCard
            label="Última sesión"
            value={summary.lastSession
              ? new Date(summary.lastSession.dateTime).toLocaleDateString("es-CL", { day: "numeric", month: "short" })
              : "—"}
            sub={summary.lastSession?.therapistName}
            color={summary.lastSession ? "text-orange-600" : "text-muted-foreground"}
            icon={<Clock className="h-3.5 w-3.5" />}
          />
          <SummaryCard
            label="Sesiones"
            value={`${summary.completedSessions}`}
            sub="completadas"
            color="text-rasma-teal"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          />
          {canSeeNotes && (
            <SummaryCard
              label="Notas pendientes"
              value={`${summary.pendingNotes}`}
              sub={summary.pendingNotes > 0 ? "sin completar" : undefined}
              color={summary.pendingNotes > 0 ? "text-amber-600" : "text-muted-foreground"}
              icon={<FileText className="h-3.5 w-3.5" />}
              alert={summary.pendingNotes > 0}
            />
          )}
          <SummaryCard
            label="Profesionales"
            value={`${summary.teamCount}`}
            sub="asignados"
            color="text-purple-600"
            icon={<Users2 className="h-3.5 w-3.5" />}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">{UI.patients.tabInfo}</TabsTrigger>
          <TabsTrigger value="appointments">
            Citas ({appointments.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Pagos ({payments.length})
          </TabsTrigger>
          {canSeeNotes && (
            <TabsTrigger value="notes">
              Notas ({notes.length})
            </TabsTrigger>
          )}
          {canSeeNotes && (
            <TabsTrigger value="plans">
              Planes ({plans.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="team">Equipo</TabsTrigger>
          <TabsTrigger value="documents">
            Documentos ({files.length})
          </TabsTrigger>
        </TabsList>

        {/* Info tab */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Contacto</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label={UI.patients.email} value={patient.email} icon={Mail} />
                <InfoRow label={UI.patients.phone} value={patient.phone} icon={Phone} />
                <InfoRow label={UI.patients.address} value={patient.address} icon={MapPin} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Información Personal</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label={UI.patients.dateOfBirth} value={patient.dateOfBirth} icon={User} />
                <InfoRow
                  label={UI.patients.gender}
                  value={patient.gender ? UI.patients.genders[patient.gender as keyof typeof UI.patients.genders] : null}
                />
                <InfoRow label={UI.patients.therapist} value={patient.primaryTherapist?.name || null} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{UI.patients.emergencyContact}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label={UI.patients.emergencyContactName} value={patient.emergencyContactName} icon={Shield} />
                <InfoRow label={UI.patients.emergencyContactPhone} value={patient.emergencyContactPhone} icon={Phone} />
                <InfoRow label={UI.patients.emergencyContactRelation} value={patient.emergencyContactRelation} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Seguro e Información Adicional</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label={UI.patients.insurance} value={patient.insuranceProvider} />
                <InfoRow label={UI.patients.insuranceNumber} value={patient.insuranceNumber} />
                <InfoRow label={UI.patients.referralSource} value={patient.referralSource} />
              </CardContent>
            </Card>
          </div>

          {(clinicalProfile.strengths || clinicalProfile.objectives || clinicalProfile.familySupport || clinicalProfile.interests) && (
            <div className="grid gap-4 md:grid-cols-2">
              {clinicalProfile.strengths && (
                <Card><CardHeader><CardTitle className="text-base">Fortalezas</CardTitle></CardHeader>
                  <CardContent><p className="text-sm whitespace-pre-wrap">{clinicalProfile.strengths}</p></CardContent></Card>
              )}
              {clinicalProfile.objectives && (
                <Card><CardHeader><CardTitle className="text-base">Objetivo</CardTitle></CardHeader>
                  <CardContent><p className="text-sm whitespace-pre-wrap">{clinicalProfile.objectives}</p></CardContent></Card>
              )}
              {clinicalProfile.familySupport && (
                <Card><CardHeader><CardTitle className="text-base">Apoyo Familiar</CardTitle></CardHeader>
                  <CardContent><p className="text-sm whitespace-pre-wrap">{clinicalProfile.familySupport}</p></CardContent></Card>
              )}
              {clinicalProfile.interests && (
                <Card><CardHeader><CardTitle className="text-base">Intereses</CardTitle></CardHeader>
                  <CardContent><p className="text-sm whitespace-pre-wrap">{clinicalProfile.interests}</p></CardContent></Card>
              )}
            </div>
          )}

          {patient.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">{UI.patients.notes}</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm">{patient.notes}</p></CardContent>
            </Card>
          )}

          <AssignedProfessionals patientId={patient.id} />
        </TabsContent>

        {/* Appointments tab */}
        <TabsContent value="appointments" className="mt-4">
          {appointments.length === 0 ? (
            <EmptyState icon={Calendar} title="Sin citas" description="Este paciente no tiene citas registradas." />
          ) : (
            <Card className="py-0 gap-0 overflow-hidden">
              <CardContent className="p-0">
                <div className="divide-y">
                  {appointments.map((appt) => {
                    const dt = new Date(appt.dateTime);
                    const isCompleted = appt.status === "completada";
                    const needsNote = isCompleted && !appt.hasNote;
                    return (
                      <Link key={appt.id} href={`/citas/${appt.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                          needsNote ? "bg-amber-50" : "bg-muted"
                        )}>
                          <Calendar className={cn("h-4 w-4", needsNote ? "text-amber-500" : "text-muted-foreground")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {dt.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {dt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} · {appt.durationMinutes}min · {appt.therapistName} · {sessionTypeLabels[appt.sessionType] || appt.sessionType}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {needsNote && (
                            <Badge variant="warning" className="text-[10px] px-1.5">Sin nota</Badge>
                          )}
                          {appt.hasNote && (
                            <FileText className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                          {appt.modality === "online" ? <Video className="h-3.5 w-3.5 text-rasma-teal" /> : <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                          <StatusBadge type="appointment" status={appt.status} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payments tab */}
        <TabsContent value="payments" className="mt-4">
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sin pagos" description="Este paciente no tiene pagos registrados." />
          ) : (
            <Card className="py-0 gap-0 overflow-hidden">
              <CardContent className="p-0">
                <div className="divide-y">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">${(p.amount / 100).toLocaleString("es-CL")}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(p.date + "T12:00:00").toLocaleDateString("es-CL")}
                          {p.paymentMethod && ` · ${methodLabels[p.paymentMethod] || p.paymentMethod}`}
                        </p>
                      </div>
                      <StatusBadge type="payment" status={p.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notes tab */}
        {canSeeNotes && (
          <TabsContent value="notes" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Link href="/notas/nueva">
                <Button size="sm" className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Nueva nota
                </Button>
              </Link>
            </div>
            {notes.length === 0 ? (
              <EmptyState icon={FileText} title="Sin notas clínicas" description="Este paciente no tiene notas clínicas." />
            ) : (
              <Card className="py-0 gap-0 overflow-hidden">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {notes.map((note) => (
                      <Link key={note.id} href={`/notas/${note.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                          <Shield className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            Nota SOAP
                            {note.sessionType && ` — ${sessionTypeLabels[note.sessionType] || note.sessionType}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(note.appointmentDate).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                            {" · "}
                            {note.therapistName}
                            {note.modality && ` · ${note.modality === "online" ? "Online" : "Presencial"}`}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200 shrink-0">
                          <Shield className="h-2.5 w-2.5" /> Encriptado
                        </span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Plans tab */}
        {canSeeNotes && (
          <TabsContent value="plans" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Link href="/planes/nuevo">
                <Button size="sm" className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" /> Nuevo plan
                </Button>
              </Link>
            </div>
            {plans.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Sin planes de tratamiento" description="Este paciente no tiene planes de tratamiento." />
            ) : (
              <div className="space-y-2">
                {plans.map((plan) => {
                  const tasks = plan.tasks || [];
                  const completedTasks = tasks.filter((t) => t.completed).length;
                  const totalTasks = tasks.length;
                  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                  const therapistDisplay = plan.therapist?.name || plan.therapistName || "—";

                  return (
                    <Card key={plan.id} className="py-0 gap-0 overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <StatusBadge type="plan" status={plan.status} />
                              <span className="text-xs text-muted-foreground">
                                Inicio: {new Date(plan.startDate + "T12:00:00").toLocaleDateString("es-CL")}
                              </span>
                            </div>
                            {plan.diagnosis && (
                              <p className="text-sm font-medium mb-1">{plan.diagnosis}</p>
                            )}
                            {plan.goals && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{plan.goals}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {therapistDisplay}
                              {plan.nextReviewDate && ` · Revisión: ${new Date(plan.nextReviewDate + "T12:00:00").toLocaleDateString("es-CL")}`}
                            </p>
                          </div>
                        </div>

                        {/* Task progress */}
                        {totalTasks > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                              <span>{completedTasks}/{totalTasks} tareas</span>
                              <span className="font-medium">{percent}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  percent === 100 ? "bg-emerald-500" : "bg-rasma-teal"
                                )}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        {/* Care team tab */}
        <TabsContent value="team" className="mt-4">
          <CareTeamTab patientId={patient.id} userRole={userRole} />
        </TabsContent>

        {/* Documents tab */}
        <TabsContent value="documents" className="mt-4">
          <PatientDocumentsTab
            patientId={patient.id}
            files={files}
            canManage={["admin", "terapeuta"].includes(userRole)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Summary card helper ─── */

function SummaryCard({
  label,
  value,
  sub,
  color,
  icon,
  alert,
}: {
  label: string;
  value: string;
  sub?: string | null;
  color: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border px-3 py-2.5",
      alert ? "border-amber-200 bg-amber-50/40" : "bg-background"
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={color}>{icon}</span>
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
      </div>
      <p className={cn("text-lg font-bold leading-none", color)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

/* ─── Care team tab ─── */

function CareTeamTab({ patientId, userRole }: { patientId: string; userRole: string }) {
  const [members, setMembers] = useState<Awaited<ReturnType<typeof getCareTeamWithActivity>>>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const canManage = ["admin", "terapeuta"].includes(userRole);

  useEffect(() => {
    getCareTeamWithActivity(patientId).then((m) => {
      setMembers(m);
      setLoading(false);
    });
  }, [patientId]);

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      const result = await removeCareTeamMember(patientId, userId);
      if (result.success) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
        toast.success("Miembro removido del equipo");
      }
    });
  };

  const handleAdded = () => {
    getCareTeamWithActivity(patientId).then(setMembers);
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Cargando equipo...</div>;
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <AddTeamMemberDialog
            patientId={patientId}
            existingMemberIds={members.map((m) => m.userId)}
            onAdded={handleAdded}
          />
        </div>
      )}

      {members.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="Sin equipo de atención"
          description="Asigne profesionales al equipo de atención de este paciente."
        />
      ) : (
        <Card className="py-0 gap-0 overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                  {member.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.user.image} alt={member.user.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <AvatarInitials name={member.user.name} size="sm" className="h-9 w-9" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{member.user.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {member.user.specialty || member.user.role}
                      {member.role === "lead" && " · Líder"}
                      {member.activity && (
                        <>
                          {" · "}
                          {member.activity.totalSessions} sesiones
                          {" · "}
                          Última: {new Date(member.activity.lastDate).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                        </>
                      )}
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-rasma-red"
                      onClick={() => handleRemove(member.userId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Add team member dialog ─── */

function AddTeamMemberDialog({
  patientId,
  existingMemberIds,
  onAdded,
}: {
  patientId: string;
  existingMemberIds: string[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [therapists, setTherapists] = useState<{ id: string; name: string; specialty: string | null; image: string | null }[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      getTherapists().then(setTherapists);
    }
  }, [open]);

  const available = therapists.filter((t) => !existingMemberIds.includes(t.id));

  const handleAdd = async (userId: string) => {
    setAdding(userId);
    const result = await addCareTeamMember(patientId, userId);
    if (result.success) {
      toast.success("Profesional agregado al equipo");
      onAdded();
      setOpen(false);
    } else {
      toast.error(result.error || "Error al agregar");
    }
    setAdding(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Agregar profesional
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar al equipo</DialogTitle>
          <DialogDescription>Seleccione un profesional para agregar al equipo de atención.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Todos los profesionales ya están asignados.
            </p>
          ) : (
            available.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <AvatarInitials name={t.name} size="sm" image={t.image} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.name}</p>
                  {t.specialty && <p className="text-[11px] text-muted-foreground">{t.specialty}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleAdd(t.id)}
                  disabled={adding === t.id}
                >
                  {adding === t.id ? "..." : "Agregar"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
