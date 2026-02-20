"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Calendar, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { togglePlanTask, addPlanTask, removePlanTask } from "@/actions/plans";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

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
  const router = useRouter();

  const patientName = `${plan.patient.firstName} ${plan.patient.lastName}`;
  const completedCount = plan.tasks.filter((t) => t.completed).length;
  const totalTasks = plan.tasks.length;

  const handleToggle = async (taskId: string) => {
    await togglePlanTask(taskId);
    router.refresh();
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAdding(true);
    await addPlanTask(plan.id, newTaskTitle);
    setNewTaskTitle("");
    setAdding(false);
    router.refresh();
  };

  const handleRemoveTask = async (taskId: string) => {
    await removePlanTask(taskId);
    router.refresh();
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
                <p className="text-xs text-muted-foreground">Revisión</p>
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

            {plan.tasks.length > 0 && (
              <div className="space-y-1">
                {plan.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 py-1.5 group"
                  >
                    <button
                      onClick={() => handleToggle(task.id)}
                      className={cn(
                        "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
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
        </div>
      )}
    </Card>
  );
}
