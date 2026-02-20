"use client";

import { useState, useOptimistic, useTransition } from "react";
import { ChevronDown, ChevronRight, Calendar, Plus, X, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { togglePlanTask, addPlanTask, removePlanTask, deleteTreatmentPlan } from "@/actions/plans";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  optional: boolean;
  sortOrder: number;
}

interface Plan {
  id: string;
  patientId: string;
  diagnosis: string | null;
  goals: string | null;
  interventions: string | null;
  startDate: string;
  nextReviewDate: string | null;
  status: string;
  patient: { id: string; firstName: string; lastName: string };
  therapist: { id: string; name: string };
  tasks: Task[];
}

interface ExpandablePlanProps {
  plan: Plan;
  canEdit: boolean;
}

export function ExpandablePlan({ plan, canEdit }: ExpandablePlanProps) {
  const [expanded, setExpanded] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const patientName = `${plan.patient.firstName} ${plan.patient.lastName}`;

  // Optimistic tasks state
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    plan.tasks,
    (state: Task[], update: { type: "toggle"; taskId: string } | { type: "remove"; taskId: string }) => {
      if (update.type === "toggle") {
        return state.map((t) =>
          t.id === update.taskId ? { ...t, completed: !t.completed } : t
        );
      }
      if (update.type === "remove") {
        return state.filter((t) => t.id !== update.taskId);
      }
      return state;
    }
  );

  const completedCount = optimisticTasks.filter((t) => t.completed).length;
  const totalTasks = optimisticTasks.length;

  const handleToggle = (taskId: string) => {
    startTransition(async () => {
      setOptimisticTasks({ type: "toggle", taskId });
      await togglePlanTask(taskId);
      router.refresh();
    });
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAdding(true);
    await addPlanTask(plan.id, newTaskTitle);
    setNewTaskTitle("");
    setAdding(false);
    router.refresh();
  };

  const handleRemoveTask = (taskId: string) => {
    startTransition(async () => {
      setOptimisticTasks({ type: "remove", taskId });
      await removePlanTask(taskId);
      router.refresh();
    });
  };

  const handleDeletePlan = async () => {
    setDeleting(true);
    const result = await deleteTreatmentPlan(plan.id);
    if (result.success) {
      toast.success("Plan eliminado");
      router.refresh();
    } else {
      toast.error(result.error || "Error al eliminar plan");
    }
    setDeleting(false);
    setShowDeleteDialog(false);
  };

  return (
    <Card className="overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <AvatarInitials name={patientName} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{patientName}</p>
          {plan.diagnosis && (
            <p className="text-xs text-muted-foreground truncate">{plan.diagnosis}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {totalTasks > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalTasks} tareas
            </span>
          )}
          <StatusBadge type="plan" status={plan.status} />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Plan info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Terapeuta</p>
              <p className="font-medium">{plan.therapist.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Inicio
              </p>
              <p className="font-medium">{plan.startDate}</p>
            </div>
            {plan.nextReviewDate && (
              <div>
                <p className="text-xs text-muted-foreground">Revision</p>
                <p className="font-medium">{plan.nextReviewDate}</p>
              </div>
            )}
          </div>

          {plan.goals && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Objetivos</p>
              <p className="text-sm bg-muted/50 rounded-lg p-2.5">{plan.goals}</p>
            </div>
          )}

          {plan.interventions && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Intervenciones</p>
              <p className="text-sm bg-muted/50 rounded-lg p-2.5">{plan.interventions}</p>
            </div>
          )}

          {/* Tasks checklist */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Tareas {totalTasks > 0 && `(${completedCount}/${totalTasks})`}
            </p>

            {optimisticTasks.length > 0 && (
              <div className="space-y-1">
                {optimisticTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 py-1.5 group"
                  >
                    <button
                      onClick={() => handleToggle(task.id)}
                      disabled={isPending}
                      className={cn(
                        "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                        task.completed
                          ? "bg-rasma-green border-rasma-green text-white"
                          : "border-gray-300 hover:border-rasma-green"
                      )}
                    >
                      {task.completed && <Check className="h-3 w-3" />}
                    </button>
                    <span className={cn(
                      "text-sm flex-1",
                      task.completed && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </span>
                    {task.optional && (
                      <Badge variant="muted" className="text-[10px] px-1.5 py-0">Opcional</Badge>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-rasma-red" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canEdit && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTask())}
                  placeholder="Agregar tarea..."
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddTask}
                  disabled={adding || !newTaskTitle.trim()}
                  className="shrink-0 h-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Actions: View patient + Delete */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Link href={`/pacientes/${plan.patient.id}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Ver ficha paciente
            </Link>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-red-600 gap-1.5 h-7 text-xs"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar plan
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar plan de tratamiento</DialogTitle>
            <DialogDescription>
              Se eliminara el plan y todas sus tareas asociadas para {patientName}. Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeletePlan} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
