"use server";

import { requireRole, CLINICAL_ROLES } from "@/lib/authorization";
import { db } from "@/lib/db";
import { treatmentPlans, treatmentPlanTasks, patients, users } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { notifyTreatmentPlanCreated, notifyTreatmentPlanStatusChanged } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PAGE_SIZE = 20;

const planSchema = z.object({
  patientId: z.string().min(1, "Seleccione un paciente"),
  diagnosis: z.string().optional(),
  goals: z.string().optional(),
  interventions: z.string().optional(),
  startDate: z.string().min(1, "Seleccione fecha de inicio"),
  nextReviewDate: z.string().optional(),
  status: z.enum(["activo", "completado", "suspendido"]).default("activo"),
});

export async function getTreatmentPlans(params?: {
  status?: string;
  patientId?: string;
  page?: number;
}) {
  const session = await requireRole(CLINICAL_ROLES);

  const page = params?.page || 1;
  const offset = (page - 1) * PAGE_SIZE;
  const conditions = [];

  if (session.user.role === "terapeuta") {
    conditions.push(eq(treatmentPlans.therapistId, session.user.id));
  }

  if (params?.status && params.status !== "all") {
    conditions.push(eq(treatmentPlans.status, params.status as "activo" | "completado" | "suspendido"));
  }

  if (params?.patientId) {
    conditions.push(eq(treatmentPlans.patientId, params.patientId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(treatmentPlans).where(where),
    db.query.treatmentPlans.findMany({
      where,
      with: {
        patient: { columns: { id: true, firstName: true, lastName: true } },
        therapist: { columns: { id: true, name: true } },
        tasks: { orderBy: (t, { asc }) => [asc(t.sortOrder)] },
      },
      orderBy: [desc(treatmentPlans.createdAt)],
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  return {
    plans: data,
    total: countResult[0].count,
    totalPages: Math.ceil(countResult[0].count / PAGE_SIZE),
    currentPage: page,
  };
}

export async function createTreatmentPlan(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireRole(CLINICAL_ROLES);

  const parsed = planSchema.safeParse({
    patientId: formData.get("patientId"),
    diagnosis: formData.get("diagnosis"),
    goals: formData.get("goals"),
    interventions: formData.get("interventions"),
    startDate: formData.get("startDate"),
    nextReviewDate: formData.get("nextReviewDate") || undefined,
    status: formData.get("status") || "activo",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [plan] = await db.insert(treatmentPlans).values({
    ...parsed.data,
    therapistId: session.user.id,
    goals: parsed.data.goals || null,
    interventions: parsed.data.interventions || null,
    diagnosis: parsed.data.diagnosis || null,
    nextReviewDate: parsed.data.nextReviewDate || null,
  }).returning({ id: treatmentPlans.id });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "treatment_plan",
    entityId: plan.id,
  });

  // Notify patient of new treatment plan (non-blocking)
  const planPatient = await db.query.patients.findFirst({
    where: eq(patients.id, parsed.data.patientId),
    columns: { firstName: true, lastName: true },
  });
  const therapist = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { name: true },
  });
  if (planPatient && therapist) {
    notifyTreatmentPlanCreated(parsed.data.patientId, {
      patientName: `${planPatient.firstName} ${planPatient.lastName}`,
      therapistName: therapist.name,
      diagnosis: parsed.data.diagnosis || null,
      startDate: parsed.data.startDate,
      goals: parsed.data.goals || null,
    }).catch(() => {});
  }

  revalidatePath("/planes");
  return { success: true };
}

export async function updateTreatmentPlan(
  id: string,
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireRole(CLINICAL_ROLES);

  const existing = await db.query.treatmentPlans.findFirst({
    where: eq(treatmentPlans.id, id),
  });

  if (!existing) return { error: "Plan no encontrado." };
  if (session.user.role === "terapeuta" && existing.therapistId !== session.user.id) {
    return { error: "No autorizado." };
  }

  const parsed = planSchema.partial().safeParse({
    patientId: formData.get("patientId"),
    diagnosis: formData.get("diagnosis"),
    goals: formData.get("goals"),
    interventions: formData.get("interventions"),
    startDate: formData.get("startDate"),
    nextReviewDate: formData.get("nextReviewDate"),
    status: formData.get("status"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.update(treatmentPlans).set({
    ...parsed.data,
    updatedAt: new Date(),
  }).where(eq(treatmentPlans.id, id));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "treatment_plan",
    entityId: id,
  });

  // Notify patient if status changed (non-blocking)
  if (parsed.data.status && parsed.data.status !== existing.status) {
    const planPatientForUpdate = await db.query.patients.findFirst({
      where: eq(patients.id, existing.patientId),
      columns: { firstName: true, lastName: true },
    });
    if (planPatientForUpdate) {
      notifyTreatmentPlanStatusChanged(
        existing.patientId,
        `${planPatientForUpdate.firstName} ${planPatientForUpdate.lastName}`,
        parsed.data.status
      ).catch(() => {});
    }
  }

  revalidatePath("/planes");
  return { success: true };
}

export async function deleteTreatmentPlan(id: string) {
  const session = await requireRole(CLINICAL_ROLES);

  const existing = await db.query.treatmentPlans.findFirst({
    where: eq(treatmentPlans.id, id),
  });
  if (!existing) return { error: "Plan no encontrado." };

  if (session.user.role === "terapeuta" && existing.therapistId !== session.user.id) {
    return { error: "No autorizado." };
  }

  // Tasks are cascade-deleted by the DB schema
  await db.delete(treatmentPlans).where(eq(treatmentPlans.id, id));

  await logAudit({
    userId: session.user.id,
    action: "delete",
    entityType: "treatment_plan",
    entityId: id,
  });

  revalidatePath("/planes");
  return { success: true };
}

// ============================================================
// PLAN TASK ACTIONS
// ============================================================

export async function togglePlanTask(taskId: string) {
  await requireRole(CLINICAL_ROLES);

  const task = await db.query.treatmentPlanTasks.findFirst({
    where: eq(treatmentPlanTasks.id, taskId),
  });
  if (!task) return { error: "Tarea no encontrada." };

  await db.update(treatmentPlanTasks).set({
    completed: !task.completed,
    updatedAt: new Date(),
  }).where(eq(treatmentPlanTasks.id, taskId));

  revalidatePath("/planes");
  return { success: true };
}

export async function addPlanTask(planId: string, title: string, optional = false) {
  await requireRole(CLINICAL_ROLES);
  if (!title.trim()) return { error: "El título es obligatorio." };

  const existing = await db
    .select({ maxOrder: sql<number>`coalesce(max(sort_order), 0)` })
    .from(treatmentPlanTasks)
    .where(eq(treatmentPlanTasks.planId, planId));

  const nextOrder = (existing[0]?.maxOrder ?? 0) + 1;

  await db.insert(treatmentPlanTasks).values({
    planId,
    title: title.trim(),
    optional,
    sortOrder: nextOrder,
  });

  revalidatePath("/planes");
  return { success: true };
}

export async function removePlanTask(taskId: string) {
  await requireRole(CLINICAL_ROLES);

  await db.delete(treatmentPlanTasks).where(eq(treatmentPlanTasks.id, taskId));

  revalidatePath("/planes");
  return { success: true };
}
