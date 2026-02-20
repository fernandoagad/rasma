"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { UI } from "@/constants/ui";
import {
  addPositionHistory,
  deletePositionHistory,
  addSalaryHistory,
  deleteSalaryHistory,
  createEvaluation,
  addBenefit,
  toggleBenefitActive,
  getStaffAnalytics,
} from "@/actions/staff";
import {
  ArrowLeft,
  FileText,
  Trash2,
  Plus,
  Briefcase,
  DollarSign,
  ClipboardCheck,
  Gift,
  Loader2,
  Sparkles,
} from "lucide-react";
import { StaffDocumentsTab } from "@/components/rrhh/staff-documents-tab";
import { StaffAnalyticsCard } from "@/components/rrhh/staff-analytics-card";
import { deactivateUser } from "@/actions/users";
import { toast } from "sonner";

interface StaffDocument {
  id: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  category: string;
  label: string | null;
  driveViewLink: string | null;
  driveDownloadLink: string | null;
  createdAt: Date;
}

interface PositionRecord {
  id: string;
  title: string;
  department: string | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

interface SalaryRecord {
  id: string;
  amount: number;
  currency: string;
  effectiveDate: string;
  reason: string | null;
}

interface EvaluationRecord {
  id: string;
  period: string;
  score: number | null;
  status: string;
  strengths: string | null;
  areasToImprove: string | null;
  goals: string | null;
  comments: string | null;
  createdAt: Date;
}

interface BenefitRecord {
  id: string;
  type: string;
  description: string;
  amount: number | null;
  startDate: string;
  endDate: string | null;
  active: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  specialty: string | null;
  area: string | null;
  therapistStatus: string | null;
  attentionType: string | null;
  image: string | null;
  createdAt: Date;
  documents: StaffDocument[];
  positions: PositionRecord[];
  salaries: SalaryRecord[];
  evaluations: EvaluationRecord[];
  benefits: BenefitRecord[];
}

export function StaffMemberDetail({ member, userRole }: { member: StaffMember; userRole: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showPositionDialog, setShowPositionDialog] = useState(false);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [showEvalDialog, setShowEvalDialog] = useState(false);
  const [showBenefitDialog, setShowBenefitDialog] = useState(false);

  const roleName = UI.users.roles[member.role as keyof typeof UI.users.roles] || member.role;

  return (
    <div className="space-y-6">
      <Link
        href="/rrhh/equipo"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-rasma-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al equipo
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        {member.image ? (
          <img src={member.image} alt={member.name} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <AvatarInitials name={member.name} size="lg" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-rasma-dark">{member.name}</h1>
            <Badge variant={member.active ? "default" : "destructive"}>
              {member.active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {roleName}
            {member.specialty && ` · ${member.specialty}`}
            {member.area && ` · ${member.area}`}
          </p>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
        {userRole === "admin" && member.active && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowRemoveDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> {UI.common.delete}
          </Button>
        )}
      </div>

      {/* Remove user confirmation */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{UI.common.confirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {UI.users.confirmRemove}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{UI.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                startTransition(async () => {
                  const result = await deactivateUser(member.id);
                  if ("error" in result) {
                    toast.error(result.error);
                  } else {
                    toast.success(UI.users.removed);
                    router.push("/rrhh/equipo");
                  }
                });
              }}
            >
              {UI.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Documentos
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-1">
            <Briefcase className="h-3.5 w-3.5" /> Cargos
          </TabsTrigger>
          <TabsTrigger value="salary" className="gap-1">
            <DollarSign className="h-3.5 w-3.5" /> Remuneración
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="gap-1">
            <ClipboardCheck className="h-3.5 w-3.5" /> Evaluaciones
          </TabsTrigger>
          <TabsTrigger value="benefits" className="gap-1">
            <Gift className="h-3.5 w-3.5" /> Beneficios
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <StaffDocumentsTab userId={member.id} files={member.documents} />
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Historial de Cargos</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowPositionDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {member.positions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sin registros de cargos.</p>
              ) : (
                <div className="space-y-3">
                  {member.positions.map((pos) => (
                    <div key={pos.id} className="flex items-start justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{pos.title}</p>
                          {!pos.endDate && <Badge className="text-[10px]">Actual</Badge>}
                        </div>
                        {pos.department && <p className="text-xs text-muted-foreground">{pos.department}</p>}
                        <p className="text-xs text-muted-foreground">
                          {pos.startDate} {pos.endDate ? `→ ${pos.endDate}` : "→ presente"}
                        </p>
                        {pos.notes && <p className="text-xs text-muted-foreground mt-1">{pos.notes}</p>}
                      </div>
                      <button
                        onClick={() => startTransition(async () => { await deletePositionHistory(pos.id, member.id); router.refresh(); })}
                        className="p-1 hover:bg-destructive/10 rounded text-destructive shrink-0"
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Tab */}
        <TabsContent value="salary">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Historial de Remuneración</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowSalaryDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {member.salaries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sin registros de remuneración.</p>
              ) : (
                <div className="space-y-3">
                  {member.salaries.map((sal, i) => (
                    <div key={sal.id} className="flex items-start justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">${sal.amount.toLocaleString("es-CL")} {sal.currency}/mes</p>
                          {i === 0 && <Badge className="text-[10px]">Actual</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">Desde {sal.effectiveDate}</p>
                        {sal.reason && <p className="text-xs text-muted-foreground">{sal.reason}</p>}
                      </div>
                      <button
                        onClick={() => startTransition(async () => { await deleteSalaryHistory(sal.id, member.id); router.refresh(); })}
                        className="p-1 hover:bg-destructive/10 rounded text-destructive shrink-0"
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations" className="space-y-4">
          <StaffAnalyticsCard userId={member.id} />
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Evaluaciones de Desempeño</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowEvalDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Nueva evaluación
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {member.evaluations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sin evaluaciones.</p>
              ) : (
                <div className="space-y-3">
                  {member.evaluations.map((ev) => (
                    <div key={ev.id} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">Período: {ev.period}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {UI.rrhh.evalStatuses[ev.status] || ev.status}
                          </Badge>
                        </div>
                        {ev.score && (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div
                                key={n}
                                className={`h-2 w-5 rounded-full ${n <= ev.score! ? "bg-rasma-teal" : "bg-muted"}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {ev.strengths && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Fortalezas</p>
                          <p className="text-sm">{ev.strengths}</p>
                        </div>
                      )}
                      {ev.areasToImprove && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Áreas de mejora</p>
                          <p className="text-sm">{ev.areasToImprove}</p>
                        </div>
                      )}
                      {ev.goals && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Objetivos</p>
                          <p className="text-sm">{ev.goals}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benefits Tab */}
        <TabsContent value="benefits">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Beneficios</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowBenefitDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {member.benefits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sin beneficios registrados.</p>
              ) : (
                <div className="space-y-3">
                  {member.benefits.map((ben) => (
                    <div key={ben.id} className="flex items-start justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {UI.rrhh.benefitTypes[ben.type] || ben.type}
                          </Badge>
                          <Badge variant={ben.active ? "default" : "secondary"} className="text-[10px]">
                            {ben.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <p className="text-sm">{ben.description}</p>
                        {ben.amount && <p className="text-xs text-muted-foreground">${ben.amount.toLocaleString("es-CL")} CLP</p>}
                        <p className="text-xs text-muted-foreground">
                          {ben.startDate} {ben.endDate ? `→ ${ben.endDate}` : "→ indefinido"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => startTransition(async () => { await toggleBenefitActive(ben.id, member.id); router.refresh(); })}
                        disabled={isPending}
                      >
                        {ben.active ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Position Dialog */}
      <PositionDialog
        open={showPositionDialog}
        onOpenChange={setShowPositionDialog}
        onSave={(data) => startTransition(async () => { await addPositionHistory(member.id, data); setShowPositionDialog(false); router.refresh(); })}
      />

      {/* Add Salary Dialog */}
      <SalaryDialog
        open={showSalaryDialog}
        onOpenChange={setShowSalaryDialog}
        onSave={(data) => startTransition(async () => { await addSalaryHistory(member.id, data); setShowSalaryDialog(false); router.refresh(); })}
      />

      {/* Add Evaluation Dialog */}
      <EvaluationDialog
        open={showEvalDialog}
        onOpenChange={setShowEvalDialog}
        memberId={member.id}
        onSave={(data) => startTransition(async () => { await createEvaluation(member.id, data); setShowEvalDialog(false); router.refresh(); })}
      />

      {/* Add Benefit Dialog */}
      <BenefitDialog
        open={showBenefitDialog}
        onOpenChange={setShowBenefitDialog}
        onSave={(data) => startTransition(async () => { await addBenefit(member.id, data); setShowBenefitDialog(false); router.refresh(); })}
      />
    </div>
  );
}

// ============================================================
// Sub-dialogs
// ============================================================

function PositionDialog({ open, onOpenChange, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: { title: string; department?: string; startDate: string; endDate?: string; notes?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  function handleSave() {
    if (!title.trim() || !startDate) return;
    onSave({ title, department: department || undefined, startDate, endDate: endDate || undefined, notes: notes || undefined });
    setTitle(""); setDepartment(""); setStartDate(""); setEndDate(""); setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Agregar cargo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título del cargo *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Psicóloga Infantil" /></div>
          <div><Label>Departamento</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Ej: Clínica" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha inicio *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>Fecha fin</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <Button onClick={handleSave} disabled={!title.trim() || !startDate} className="w-full">Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SalaryDialog({ open, onOpenChange, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: { amount: number; effectiveDate: string; reason?: string }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");

  function handleSave() {
    const numAmount = parseInt(amount);
    if (!numAmount || !effectiveDate) return;
    onSave({ amount: numAmount, effectiveDate, reason: reason || undefined });
    setAmount(""); setEffectiveDate(""); setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Agregar remuneración</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Monto mensual bruto (CLP) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej: 1200000" /></div>
          <div><Label>Fecha efectiva *</Label><Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></div>
          <div><Label>Razón</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Aumento anual, cambio de cargo" /></div>
          <Button onClick={handleSave} disabled={!amount || !effectiveDate} className="w-full">Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EvaluationDialog({ open, onOpenChange, memberId, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  memberId: string;
  onSave: (data: { period: string; score?: number; strengths?: string; areasToImprove?: string; goals?: string; comments?: string }) => void;
}) {
  const [period, setPeriod] = useState("");
  const [score, setScore] = useState<number | undefined>();
  const [strengths, setStrengths] = useState("");
  const [areasToImprove, setAreasToImprove] = useState("");
  const [goals, setGoals] = useState("");
  const [comments, setComments] = useState("");
  const [generating, setGenerating] = useState(false);

  function handleSave() {
    if (!period.trim()) return;
    onSave({ period, score, strengths: strengths || undefined, areasToImprove: areasToImprove || undefined, goals: goals || undefined, comments: comments || undefined });
    setPeriod(""); setScore(undefined); setStrengths(""); setAreasToImprove(""); setGoals(""); setComments("");
  }

  async function handleAutoGenerate() {
    if (!period.trim()) return;
    setGenerating(true);
    try {
      // Parse period to date range. Try formats like "2025-Q4", "2026-Q1", "Enero 2026", etc.
      let dateFrom: string | undefined;
      let dateTo: string | undefined;
      const qMatch = period.match(/(\d{4})-Q(\d)/i);
      if (qMatch) {
        const year = parseInt(qMatch[1]);
        const q = parseInt(qMatch[2]);
        const startMonth = (q - 1) * 3;
        dateFrom = new Date(year, startMonth, 1).toISOString().split("T")[0];
        dateTo = new Date(year, startMonth + 3, 0).toISOString().split("T")[0];
      }

      const data = await getStaffAnalytics({ userId: memberId, dateFrom, dateTo });
      if (!data) { setGenerating(false); return; }

      const strengthsList: string[] = [];
      const improvementsList: string[] = [];

      if (data.appointments.completionRate >= 80) {
        strengthsList.push(`Tasa de cumplimiento: ${data.appointments.completionRate}%`);
      } else if (data.appointments.completionRate < 60) {
        improvementsList.push(`Tasa de cumplimiento: ${data.appointments.completionRate}% (equipo: ${data.teamAverage.completionRate}%)`);
      }

      if (data.uniquePatients >= data.teamAverage.uniquePatients) {
        strengthsList.push(`${data.uniquePatients} pacientes atendidos (equipo: ${data.teamAverage.uniquePatients})`);
      } else {
        improvementsList.push(`Pacientes atendidos: ${data.uniquePatients} (equipo: ${data.teamAverage.uniquePatients})`);
      }

      if (data.notesRate >= 80) {
        strengthsList.push(`Documentación clínica: ${data.notesRate}% completitud`);
      } else if (data.notesRate < 60) {
        improvementsList.push(`Notas clínicas: ${data.notesRate}% completitud`);
      }

      if (data.revenue >= data.teamAverage.revenue) {
        strengthsList.push(`Ingresos: $${data.revenue.toLocaleString("es-CL")} (equipo: $${data.teamAverage.revenue.toLocaleString("es-CL")})`);
      }

      if (data.plans.currentlyActive > 0) {
        strengthsList.push(`${data.plans.currentlyActive} plan(es) de tratamiento activos`);
      }

      setStrengths(strengthsList.join(". ") + (strengthsList.length ? "." : ""));
      setAreasToImprove(improvementsList.join(". ") + (improvementsList.length ? "." : ""));

      // Build comments summary
      const commentLines = [
        `Citas: ${data.appointments.total} (completadas: ${data.appointments.completed}, canceladas: ${data.appointments.cancelled}, no asistió: ${data.appointments.noShow})`,
        `Tasa de cumplimiento: ${data.appointments.completionRate}% (equipo: ${data.teamAverage.completionRate}%)`,
        `Pacientes únicos: ${data.uniquePatients} (equipo: ${data.teamAverage.uniquePatients})`,
        `Ingresos: $${data.revenue.toLocaleString("es-CL")} (equipo: $${data.teamAverage.revenue.toLocaleString("es-CL")})`,
        `Notas clínicas: ${data.notesCount} (${data.notesRate}%, equipo: ${data.teamAverage.notesRate}%)`,
        `Planes creados: ${data.plans.createdInPeriod}, activos: ${data.plans.currentlyActive}`,
      ];
      setComments(commentLines.join("\n"));

      // Auto-score based on weighted metrics
      const completionScore = data.appointments.completionRate >= 90 ? 5 : data.appointments.completionRate >= 75 ? 4 : data.appointments.completionRate >= 60 ? 3 : data.appointments.completionRate >= 40 ? 2 : 1;
      const notesScore = data.notesRate >= 90 ? 5 : data.notesRate >= 75 ? 4 : data.notesRate >= 60 ? 3 : data.notesRate >= 40 ? 2 : 1;
      const patientScore = data.uniquePatients >= data.teamAverage.uniquePatients * 1.2 ? 5 : data.uniquePatients >= data.teamAverage.uniquePatients ? 4 : data.uniquePatients >= data.teamAverage.uniquePatients * 0.7 ? 3 : 2;
      const avgScore = Math.round((completionScore * 0.4 + notesScore * 0.3 + patientScore * 0.3));
      setScore(Math.max(1, Math.min(5, avgScore)));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva evaluación de desempeño</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Período *</Label><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Ej: 2025-Q4, Enero 2026" /></div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleAutoGenerate}
            disabled={!period.trim() || generating}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generando..." : "Generar desde datos"}
          </Button>

          <div>
            <Label>Puntuación (1-5)</Label>
            <div className="flex gap-2 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(score === n ? undefined : n)}
                  className={`h-8 w-8 rounded-lg border text-sm font-medium transition-colors ${score && n <= score ? "bg-rasma-teal text-white border-rasma-teal" : "hover:bg-accent"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div><Label>Fortalezas</Label><Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} className="min-h-[60px]" /></div>
          <div><Label>Áreas de mejora</Label><Textarea value={areasToImprove} onChange={(e) => setAreasToImprove(e.target.value)} className="min-h-[60px]" /></div>
          <div><Label>Objetivos</Label><Textarea value={goals} onChange={(e) => setGoals(e.target.value)} className="min-h-[60px]" /></div>
          <div><Label>Comentarios</Label><Textarea value={comments} onChange={(e) => setComments(e.target.value)} className="min-h-[80px]" /></div>
          <Button onClick={handleSave} disabled={!period.trim()} className="w-full">Guardar evaluación</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BenefitDialog({ open, onOpenChange, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: { type: string; description: string; amount?: number; startDate: string; endDate?: string }) => void;
}) {
  const [type, setType] = useState("otro");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleSave() {
    if (!description.trim() || !startDate) return;
    onSave({ type, description, amount: amount ? parseInt(amount) : undefined, startDate, endDate: endDate || undefined });
    setType("otro"); setDescription(""); setAmount(""); setStartDate(""); setEndDate("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Agregar beneficio</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(UI.rrhh.benefitTypes).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Descripción *</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Bono de transporte mensual" /></div>
          <div><Label>Monto (CLP, opcional)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej: 50000" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha inicio *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>Fecha fin</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <Button onClick={handleSave} disabled={!description.trim() || !startDate} className="w-full">Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
