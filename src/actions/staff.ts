"use server";

import { requireStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import {
  users,
  staffDocuments,
  positionHistory,
  salaryHistory,
  performanceEvaluations,
  staffBenefits,
  appointments,
  payments,
  sessionNotes,
  treatmentPlans,
} from "@/lib/db/schema";
import { eq, desc, inArray, and, gte, lte, sql } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { deleteFileFromDriveById, renameFileOnDrive } from "@/lib/google-drive";

function isHRAuthorized(role: string): boolean {
  return role === "admin" || role === "rrhh";
}

// ============================================================
// Staff member detail
// ============================================================

export async function getStaffMember(userId: string) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true, name: true, email: true, role: true, active: true,
      specialty: true, area: true, therapistStatus: true, attentionType: true,
      image: true, createdAt: true,
    },
  });
  if (!user) return null;

  const [docs, positions, salaries, evaluations, benefits] = await Promise.all([
    db.select().from(staffDocuments).where(eq(staffDocuments.userId, userId)).orderBy(desc(staffDocuments.createdAt)),
    db.select().from(positionHistory).where(eq(positionHistory.userId, userId)).orderBy(desc(positionHistory.startDate)),
    db.select().from(salaryHistory).where(eq(salaryHistory.userId, userId)).orderBy(desc(salaryHistory.effectiveDate)),
    db.select({
      id: performanceEvaluations.id,
      period: performanceEvaluations.period,
      score: performanceEvaluations.score,
      status: performanceEvaluations.status,
      strengths: performanceEvaluations.strengths,
      areasToImprove: performanceEvaluations.areasToImprove,
      goals: performanceEvaluations.goals,
      comments: performanceEvaluations.comments,
      evaluatorId: performanceEvaluations.evaluatorId,
      createdAt: performanceEvaluations.createdAt,
    }).from(performanceEvaluations).where(eq(performanceEvaluations.userId, userId)).orderBy(desc(performanceEvaluations.period)),
    db.select().from(staffBenefits).where(eq(staffBenefits.userId, userId)).orderBy(desc(staffBenefits.createdAt)),
  ]);

  return { ...user, documents: docs, positions, salaries, evaluations, benefits };
}

// ============================================================
// Documents
// ============================================================

export async function deleteStaffDocument(docId: string, userId: string) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  const doc = await db.query.staffDocuments.findFirst({ where: eq(staffDocuments.id, docId) });
  if (!doc) return { error: "Documento no encontrado." };

  try {
    await deleteFileFromDriveById(doc.driveFileId);
  } catch { /* best effort */ }

  await db.delete(staffDocuments).where(eq(staffDocuments.id, docId));
  await logAudit({ userId: session.user.id, action: "delete", entityType: "staff_document", entityId: docId, details: { staffUserId: userId } });
  revalidatePath(`/rrhh/equipo/${userId}`);
  return { success: true };
}

export async function renameStaffDocument(docId: string, userId: string, newFileName: string) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  const trimmed = newFileName.trim();
  if (!trimmed || trimmed.length > 255) return { error: "Nombre inválido." };

  const doc = await db.query.staffDocuments.findFirst({ where: eq(staffDocuments.id, docId) });
  if (!doc) return { error: "Documento no encontrado." };

  try { await renameFileOnDrive(doc.driveFileId, trimmed); } catch { /* best effort */ }

  await db.update(staffDocuments).set({ fileName: trimmed }).where(eq(staffDocuments.id, docId));
  await logAudit({ userId: session.user.id, action: "update", entityType: "staff_document", entityId: docId, details: { staffUserId: userId, newName: trimmed } });
  revalidatePath(`/rrhh/equipo/${userId}`);
  return { success: true };
}

export async function updateStaffDocumentLabel(docId: string, userId: string, label: string | null) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  const trimmed = label?.trim() || null;
  if (trimmed && trimmed.length > 100) return { error: "Etiqueta muy larga (máx 100 caracteres)." };

  await db.update(staffDocuments).set({ label: trimmed }).where(eq(staffDocuments.id, docId));
  await logAudit({ userId: session.user.id, action: "update", entityType: "staff_document", entityId: docId, details: { staffUserId: userId, label: trimmed } });
  revalidatePath(`/rrhh/equipo/${userId}`);
  return { success: true };
}

export async function updateStaffDocumentCategory(docId: string, userId: string, category: string) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  const valid = ["cv", "contrato", "certificacion", "evaluacion", "otro"];
  if (!valid.includes(category)) return { error: "Categoría inválida." };

  await db.update(staffDocuments).set({ category: category as "cv" | "contrato" | "certificacion" | "evaluacion" | "otro" }).where(eq(staffDocuments.id, docId));
  await logAudit({ userId: session.user.id, action: "update", entityType: "staff_document", entityId: docId, details: { staffUserId: userId, category } });
  revalidatePath(`/rrhh/equipo/${userId}`);
  return { success: true };
}

export async function bulkUpdateStaffDocumentLabel(docIds: string[], userId: string, label: string | null) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };
  if (docIds.length === 0) return { error: "Sin documentos seleccionados." };

  const trimmed = label?.trim() || null;
  await db.update(staffDocuments).set({ label: trimmed }).where(inArray(staffDocuments.id, docIds));
  await logAudit({ userId: session.user.id, action: "update", entityType: "staff_document", details: { staffUserId: userId, bulkLabel: trimmed, count: docIds.length } });
  revalidatePath(`/rrhh/equipo/${userId}`);
  return { success: true };
}

export async function bulkUpdateStaffDocumentCategory(docIds: string[], userId: string, category: string) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };
  if (docIds.length === 0) return { error: "Sin documentos seleccionados." };

  const valid = ["cv", "contrato", "certificacion", "evaluacion", "otro"];
  if (!valid.includes(category)) return { error: "Categoría inválida." };

  await db.update(staffDocuments).set({ category: category as "cv" | "contrato" | "certificacion" | "evaluacion" | "otro" }).where(inArray(staffDocuments.id, docIds));
  await logAudit({ userId: session.user.id, action: "update", entityType: "staff_document", details: { staffUserId: userId, bulkCategory: category, count: docIds.length } });
  revalidatePath(`/rrhh/equipo/${userId}`);
  return { success: true };
}

// ============================================================
// Staff analytics
// ============================================================

export async function getStaffAnalytics(params: {
  userId: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return null;

  const now = new Date();
  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const dateTo = params.dateTo ? new Date(params.dateTo + "T23:59:59") : now;

  const [
    individualStats,
    uniquePatients,
    revenueResult,
    notesCount,
    planStats,
    teamStats,
  ] = await Promise.all([
    // Individual appointment stats
    db.select({
      total: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${appointments.status} = 'completada' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${appointments.status} = 'cancelada' then 1 else 0 end)`,
      noShow: sql<number>`sum(case when ${appointments.status} = 'no_asistio' then 1 else 0 end)`,
    }).from(appointments).where(and(
      eq(appointments.therapistId, params.userId),
      gte(appointments.dateTime, dateFrom),
      lte(appointments.dateTime, dateTo)
    )),

    // Unique patients
    db.select({
      count: sql<number>`count(distinct ${appointments.patientId})`,
    }).from(appointments).where(and(
      eq(appointments.therapistId, params.userId),
      eq(appointments.status, "completada"),
      gte(appointments.dateTime, dateFrom),
      lte(appointments.dateTime, dateTo)
    )),

    // Revenue via payments linked to appointments
    db.select({
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    }).from(payments)
      .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
      .where(and(
        eq(appointments.therapistId, params.userId),
        eq(payments.status, "pagado"),
        gte(appointments.dateTime, dateFrom),
        lte(appointments.dateTime, dateTo)
      )),

    // Session notes count
    db.select({
      count: sql<number>`count(*)`,
    }).from(sessionNotes).where(and(
      eq(sessionNotes.therapistId, params.userId),
      gte(sessionNotes.createdAt, dateFrom),
      lte(sessionNotes.createdAt, dateTo)
    )),

    // Treatment plans: created in period + currently active
    Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(treatmentPlans).where(and(
        eq(treatmentPlans.therapistId, params.userId),
        gte(treatmentPlans.createdAt, dateFrom),
        lte(treatmentPlans.createdAt, dateTo)
      )),
      db.select({ count: sql<number>`count(*)` }).from(treatmentPlans).where(and(
        eq(treatmentPlans.therapistId, params.userId),
        eq(treatmentPlans.status, "activo")
      )),
    ]),

    // Team averages (all therapists in the period)
    Promise.all([
      db.select({
        therapistCount: sql<number>`count(distinct ${appointments.therapistId})`,
        totalAppts: sql<number>`count(*)`,
        completedAppts: sql<number>`sum(case when ${appointments.status} = 'completada' then 1 else 0 end)`,
        uniquePatients: sql<number>`count(distinct case when ${appointments.status} = 'completada' then ${appointments.patientId} end)`,
      }).from(appointments).where(and(
        gte(appointments.dateTime, dateFrom),
        lte(appointments.dateTime, dateTo)
      )),
      db.select({
        totalRevenue: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      }).from(payments)
        .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
        .where(and(
          eq(payments.status, "pagado"),
          gte(appointments.dateTime, dateFrom),
          lte(appointments.dateTime, dateTo)
        )),
      db.select({
        count: sql<number>`count(*)`,
      }).from(sessionNotes).where(and(
        gte(sessionNotes.createdAt, dateFrom),
        lte(sessionNotes.createdAt, dateTo)
      )),
    ]),
  ]);

  const stats = individualStats[0];
  const completed = stats.completed ?? 0;
  const total = stats.total ?? 0;
  const [plansCreated, plansActive] = planStats;
  const [teamAppts, teamRevenue, teamNotes] = teamStats;

  const therapistCount = teamAppts[0].therapistCount || 1;

  return {
    appointments: {
      total,
      completed,
      cancelled: stats.cancelled ?? 0,
      noShow: stats.noShow ?? 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
    uniquePatients: uniquePatients[0].count ?? 0,
    revenue: (revenueResult[0].total ?? 0) / 100,
    notesCount: notesCount[0].count ?? 0,
    notesRate: completed > 0 ? Math.round(((notesCount[0].count ?? 0) / completed) * 100) : 0,
    plans: {
      createdInPeriod: plansCreated[0].count ?? 0,
      currentlyActive: plansActive[0].count ?? 0,
    },
    teamAverage: {
      appointments: Math.round((teamAppts[0].totalAppts ?? 0) / therapistCount),
      completionRate: (teamAppts[0].totalAppts ?? 0) > 0
        ? Math.round(((teamAppts[0].completedAppts ?? 0) / (teamAppts[0].totalAppts ?? 0)) * 100)
        : 0,
      uniquePatients: Math.round((teamAppts[0].uniquePatients ?? 0) / therapistCount),
      revenue: Math.round(((teamRevenue[0].totalRevenue ?? 0) / 100) / therapistCount),
      notesRate: (teamAppts[0].completedAppts ?? 0) > 0
        ? Math.round(((teamNotes[0].count ?? 0) / (teamAppts[0].completedAppts ?? 0)) * 100)
        : 0,
    },
  };
}

// ============================================================
// Position history
// ============================================================

export async function addPositionHistory(userId: string, data: {
  title: string;
  department?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  if (!data.title.trim() || !data.startDate) return { error: "Título y fecha de inicio son obligatorios." };

  await db.insert(positionHistory).values({
    userId,
    title: data.title.trim(),
    department: data.department?.trim() || null,
    startDate: data.startDate,
    endDate: data.endDate || null,
    notes: data.notes?.trim() || null,
    createdBy: session.user.id,
  });

  await logAudit({ userId: session.user.id, action: "create", entityType: "position_history", details: { staffUserId: userId, title: data.title } });
  revalidatePath(`/rrhh/equipo/${userId}`);
  return { success: true };
}

export async function deletePositionHistory(id: string, userId: string) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  await db.delete(positionHistory).where(eq(positionHistory.id, id));
  await logAudit({ userId: session.user.id, action: "delete", entityType: "position_history", entityId: id });
  revalidatePath(`/rrhh/equipo/${userId}`);
  return { success: true };
}

// ============================================================
// Salary history
// ============================================================

export async function addSalaryHistory(userId: string, data: {
  amount: number;
  effectiveDate: string;
  reason?: string;
}) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  if (!data.amount || !data.effectiveDate) return { error: "Monto y fecha son obligatorios." };

  await db.insert(salaryHistory).values({
    userId,
    amount: data.amount,
    effectiveDate: data.effectiveDate,
    reason: data.reason?.trim() || null,
    createdBy: session.user.id,
  });

  await logAudit({ userId: session.user.id, action: "create", entityType: "salary_history", details: { staffUserId: userId } });
  revalidatePath(`/rrhh/equipo/${userId}`);
  return { success: true };
}

export async function deleteSalaryHistory(id: string, userId: string) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  await db.delete(salaryHistory).where(eq(salaryHistory.id, id));
  await logAudit({ userId: session.user.id, action: "delete", entityType: "salary_history", entityId: id });
  revalidatePath(`/rrhh/equipo/${userId}`);
  return { success: true };
}

// ============================================================
// Performance evaluations
// ============================================================

export async function createEvaluation(userId: string, data: {
  period: string;
  score?: number;
  strengths?: string;
  areasToImprove?: string;
  goals?: string;
  comments?: string;
}) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  if (!data.period.trim()) return { error: "El período es obligatorio." };

  const [eval_] = await db.insert(performanceEvaluations).values({
    userId,
    evaluatorId: session.user.id,
    period: data.period.trim(),
    score: data.score ?? null,
    strengths: data.strengths?.trim() || null,
    areasToImprove: data.areasToImprove?.trim() || null,
    goals: data.goals?.trim() || null,
    comments: data.comments?.trim() || null,
    status: "borrador",
  }).returning({ id: performanceEvaluations.id });

  await logAudit({ userId: session.user.id, action: "create", entityType: "performance_evaluation", entityId: eval_.id, details: { staffUserId: userId, period: data.period } });
  revalidatePath(`/rrhh/equipo/${userId}`);
  revalidatePath("/rrhh/evaluaciones");
  return { success: true };
}

export async function updateEvaluationStatus(id: string, status: string) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  const valid = ["borrador", "completada", "revisada"];
  if (!valid.includes(status)) return { error: "Estado inválido." };

  await db.update(performanceEvaluations).set({
    status: status as "borrador" | "completada" | "revisada",
    updatedAt: new Date(),
  }).where(eq(performanceEvaluations.id, id));

  await logAudit({ userId: session.user.id, action: "update", entityType: "performance_evaluation", entityId: id, details: { newStatus: status } });
  revalidatePath("/rrhh/evaluaciones");
  return { success: true };
}

export async function getAllEvaluations() {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return [];

  return db
    .select({
      id: performanceEvaluations.id,
      period: performanceEvaluations.period,
      score: performanceEvaluations.score,
      status: performanceEvaluations.status,
      strengths: performanceEvaluations.strengths,
      areasToImprove: performanceEvaluations.areasToImprove,
      goals: performanceEvaluations.goals,
      comments: performanceEvaluations.comments,
      createdAt: performanceEvaluations.createdAt,
      userName: users.name,
      userId: performanceEvaluations.userId,
    })
    .from(performanceEvaluations)
    .innerJoin(users, eq(performanceEvaluations.userId, users.id))
    .orderBy(desc(performanceEvaluations.createdAt));
}

// ============================================================
// Benefits
// ============================================================

export async function addBenefit(userId: string, data: {
  type: string;
  description: string;
  amount?: number;
  startDate: string;
  endDate?: string;
}) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  if (!data.description.trim() || !data.startDate) return { error: "Descripción y fecha son obligatorias." };

  const validTypes = ["salud", "transporte", "alimentacion", "capacitacion", "otro"];
  if (!validTypes.includes(data.type)) return { error: "Tipo inválido." };

  await db.insert(staffBenefits).values({
    userId,
    type: data.type as "salud" | "transporte" | "alimentacion" | "capacitacion" | "otro",
    description: data.description.trim(),
    amount: data.amount || null,
    startDate: data.startDate,
    endDate: data.endDate || null,
    createdBy: session.user.id,
  });

  await logAudit({ userId: session.user.id, action: "create", entityType: "staff_benefit", details: { staffUserId: userId, type: data.type } });
  revalidatePath(`/rrhh/equipo/${userId}`);
  revalidatePath("/rrhh/beneficios");
  return { success: true };
}

export async function toggleBenefitActive(id: string, userId: string) {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return { error: "No autorizado." };

  const benefit = await db.query.staffBenefits.findFirst({ where: eq(staffBenefits.id, id) });
  if (!benefit) return { error: "Beneficio no encontrado." };

  await db.update(staffBenefits).set({ active: !benefit.active }).where(eq(staffBenefits.id, id));
  revalidatePath(`/rrhh/equipo/${userId}`);
  revalidatePath("/rrhh/beneficios");
  return { success: true };
}

export async function getAllBenefits() {
  const session = await requireStaff();
  if (!isHRAuthorized(session.user.role)) return [];

  return db
    .select({
      id: staffBenefits.id,
      type: staffBenefits.type,
      description: staffBenefits.description,
      amount: staffBenefits.amount,
      startDate: staffBenefits.startDate,
      endDate: staffBenefits.endDate,
      active: staffBenefits.active,
      userId: staffBenefits.userId,
      userName: users.name,
    })
    .from(staffBenefits)
    .innerJoin(users, eq(staffBenefits.userId, users.id))
    .orderBy(desc(staffBenefits.createdAt));
}
