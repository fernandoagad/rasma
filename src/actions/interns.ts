"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  interns,
  internHours,
  applicants,
  applicantNotes,
  users,
} from "@/lib/db/schema";
import { eq, desc, like, or, sql, and, gte, lte } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { internCreateSchema, internHoursSchema, interviewScheduleSchema } from "@/lib/validations/intern";
import {
  sendInternInterviewEmail,
  sendInternAcceptedEmail,
} from "@/lib/email";
import { createCalendarEvent, hasGoogleCalendarAccess } from "@/lib/google-calendar";

function isHRAuthorized(role: string): boolean {
  return role === "admin" || role === "rrhh";
}

// ============================================================
// LIST / GET
// ============================================================

export async function getInterns(filters?: {
  status?: string;
  search?: string;
  supervisorId?: string;
}) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) return [];

  const conditions = [];

  if (filters?.status && filters.status !== "all") {
    conditions.push(
      eq(interns.status, filters.status as "activo" | "completado" | "suspendido")
    );
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        like(interns.name, term),
        like(interns.email, term),
        like(interns.university, term)
      )!
    );
  }

  if (filters?.supervisorId && filters.supervisorId !== "all") {
    conditions.push(eq(interns.supervisorId, filters.supervisorId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: interns.id,
      name: interns.name,
      email: interns.email,
      university: interns.university,
      program: interns.program,
      status: interns.status,
      startDate: interns.startDate,
      endDate: interns.endDate,
      weeklyHours: interns.weeklyHours,
      supervisorId: interns.supervisorId,
      supervisorName: users.name,
      createdAt: interns.createdAt,
    })
    .from(interns)
    .leftJoin(users, eq(interns.supervisorId, users.id))
    .where(where)
    .orderBy(desc(interns.createdAt));

  return data;
}

export async function getInternById(id: string) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) return null;

  const intern = await db.query.interns.findFirst({
    where: eq(interns.id, id),
    with: {
      supervisor: { columns: { id: true, name: true, email: true, image: true, specialty: true } },
      applicant: { columns: { id: true, name: true, positions: true, status: true } },
    },
  });

  if (!intern) return null;

  const hours = await db
    .select({
      id: internHours.id,
      date: internHours.date,
      minutes: internHours.minutes,
      description: internHours.description,
      loggedBy: internHours.loggedBy,
      loggerName: users.name,
      createdAt: internHours.createdAt,
    })
    .from(internHours)
    .leftJoin(users, eq(internHours.loggedBy, users.id))
    .where(eq(internHours.internId, id))
    .orderBy(desc(internHours.date));

  return { ...intern, hours };
}

// ============================================================
// CREATE INTERN FROM APPLICANT
// ============================================================

export async function createInternFromApplicant(
  applicantId: string,
  data: {
    university: string;
    program: string;
    supervisorId: string;
    startDate: string;
    endDate?: string;
    weeklyHours: number;
  }
) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) {
    return { error: "No autorizado." };
  }

  const parsed = internCreateSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Validate applicant
  const applicant = await db.query.applicants.findFirst({
    where: eq(applicants.id, applicantId),
  });
  if (!applicant) return { error: "Postulante no encontrado." };

  let positions: string[] = [];
  try { positions = JSON.parse(applicant.positions); } catch { /* ignore */ }
  if (!positions.includes("Pasantía Universitaria")) {
    return { error: "El postulante no aplica a Pasantía Universitaria." };
  }

  // Check if intern already exists for this applicant
  const existing = await db.query.interns.findFirst({
    where: eq(interns.applicantId, applicantId),
  });
  if (existing) return { error: "Ya existe un perfil de pasantía para este postulante." };

  // Validate supervisor exists
  const supervisor = await db.query.users.findFirst({
    where: eq(users.id, parsed.data.supervisorId),
    columns: { id: true, name: true, active: true },
  });
  if (!supervisor || !supervisor.active) return { error: "Supervisor no válido." };

  // Create intern record
  const [intern] = await db
    .insert(interns)
    .values({
      applicantId,
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone,
      university: parsed.data.university,
      program: parsed.data.program,
      supervisorId: parsed.data.supervisorId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate || null,
      weeklyHours: parsed.data.weeklyHours,
    })
    .returning({ id: interns.id });

  // Set applicant status to "aceptado" if not already
  if (applicant.status !== "aceptado") {
    await db
      .update(applicants)
      .set({ status: "aceptado", updatedAt: new Date() })
      .where(eq(applicants.id, applicantId));

    await db.insert(applicantNotes).values({
      applicantId,
      authorId: session.user.id,
      content: `Estado cambiado a "Aceptado" — Pasantía creada`,
      type: "estado_cambiado",
    });
  }

  // Send acceptance email
  const startDateFormatted = new Date(parsed.data.startDate + "T12:00:00").toLocaleDateString("es-CL", { dateStyle: "long" });
  try {
    await sendInternAcceptedEmail(
      applicant.email,
      applicant.name,
      supervisor.name,
      startDateFormatted,
      parsed.data.university,
      parsed.data.program,
    );
  } catch (err) {
    console.error("Failed to send intern acceptance email:", err);
  }

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "intern",
    entityId: intern.id,
    details: { applicantId, university: parsed.data.university, supervisorId: parsed.data.supervisorId },
  });

  revalidatePath("/rrhh/pasantias");
  revalidatePath(`/rrhh/postulantes/${applicantId}`);
  revalidatePath("/rrhh/postulantes");
  return { success: true, internId: intern.id };
}

// ============================================================
// UPDATE
// ============================================================

export async function updateIntern(
  id: string,
  data: Partial<{
    supervisorId: string;
    startDate: string;
    endDate: string;
    weeklyHours: number;
    notes: string;
  }>
) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) {
    return { error: "No autorizado." };
  }

  const intern = await db.query.interns.findFirst({ where: eq(interns.id, id) });
  if (!intern) return { error: "Pasante no encontrado." };

  await db
    .update(interns)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(interns.id, id));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "intern",
    entityId: id,
    details: data,
  });

  revalidatePath(`/rrhh/pasantias/${id}`);
  revalidatePath("/rrhh/pasantias");
  return { success: true };
}

export async function updateInternStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) {
    return { error: "No autorizado." };
  }

  const valid = ["activo", "completado", "suspendido"];
  if (!valid.includes(status)) return { error: "Estado inválido." };

  const intern = await db.query.interns.findFirst({
    where: eq(interns.id, id),
    columns: { status: true, name: true },
  });
  if (!intern) return { error: "Pasante no encontrado." };

  await db
    .update(interns)
    .set({
      status: status as "activo" | "completado" | "suspendido",
      updatedAt: new Date(),
    })
    .where(eq(interns.id, id));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "intern",
    entityId: id,
    details: { oldStatus: intern.status, newStatus: status },
  });

  revalidatePath(`/rrhh/pasantias/${id}`);
  revalidatePath("/rrhh/pasantias");
  return { success: true };
}

// ============================================================
// HOURS LOGGING
// ============================================================

export async function logInternHours(
  internId: string,
  data: { date: string; minutes: number; description: string }
) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) {
    return { error: "No autorizado." };
  }

  const parsed = internHoursSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const intern = await db.query.interns.findFirst({
    where: eq(interns.id, internId),
    columns: { id: true, status: true },
  });
  if (!intern) return { error: "Pasante no encontrado." };
  if (intern.status !== "activo") return { error: "Solo se pueden registrar horas para pasantes activos." };

  await db.insert(internHours).values({
    internId,
    date: parsed.data.date,
    minutes: parsed.data.minutes,
    description: parsed.data.description,
    loggedBy: session.user.id,
  });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "intern_hours",
    entityId: internId,
    details: { date: parsed.data.date, minutes: parsed.data.minutes },
  });

  revalidatePath(`/rrhh/pasantias/${internId}`);
  return { success: true };
}

export async function deleteInternHourEntry(hourId: string) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) {
    return { error: "No autorizado." };
  }

  const entry = await db.query.internHours.findFirst({
    where: eq(internHours.id, hourId),
    columns: { id: true, internId: true },
  });
  if (!entry) return { error: "Registro no encontrado." };

  await db.delete(internHours).where(eq(internHours.id, hourId));

  await logAudit({
    userId: session.user.id,
    action: "delete",
    entityType: "intern_hours",
    entityId: hourId,
  });

  revalidatePath(`/rrhh/pasantias/${entry.internId}`);
  return { success: true };
}

export async function getInternHoursSummary(
  internId: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) return null;

  const conditions = [eq(internHours.internId, internId)];
  if (dateFrom) conditions.push(gte(internHours.date, dateFrom));
  if (dateTo) conditions.push(lte(internHours.date, dateTo));

  const where = and(...conditions);

  const [totalResult] = await db
    .select({
      totalMinutes: sql<number>`coalesce(sum(${internHours.minutes}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(internHours)
    .where(where);

  // This month's total
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const [monthResult] = await db
    .select({
      totalMinutes: sql<number>`coalesce(sum(${internHours.minutes}), 0)`,
    })
    .from(internHours)
    .where(and(eq(internHours.internId, internId), gte(internHours.date, firstOfMonth)));

  return {
    totalMinutes: totalResult.totalMinutes,
    totalEntries: totalResult.count,
    thisMonthMinutes: monthResult.totalMinutes,
  };
}

// ============================================================
// INTERVIEW SCHEDULING
// ============================================================

export async function scheduleInternInterview(
  applicantId: string,
  data: { date: string; time: string; durationMinutes: number; addMeetLink: boolean }
) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) {
    return { error: "No autorizado." };
  }

  const parsed = interviewScheduleSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const applicant = await db.query.applicants.findFirst({
    where: eq(applicants.id, applicantId),
    columns: { id: true, name: true, email: true, status: true },
  });
  if (!applicant) return { error: "Postulante no encontrado." };

  // Update applicant status to "entrevista" if not already
  if (applicant.status !== "entrevista") {
    await db
      .update(applicants)
      .set({ status: "entrevista", updatedAt: new Date() })
      .where(eq(applicants.id, applicantId));

    await db.insert(applicantNotes).values({
      applicantId,
      authorId: session.user.id,
      content: `Estado cambiado a "Entrevista" — Entrevista programada`,
      type: "estado_cambiado",
    });
  }

  let meetLink: string | undefined;
  let googleEventId: string | undefined;

  // Try to create Google Calendar event
  if (parsed.data.addMeetLink) {
    try {
      const hasAccess = await hasGoogleCalendarAccess(session.user.id);
      if (hasAccess) {
        const startDateTime = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
        const result = await createCalendarEvent(session.user.id, {
          summary: `Entrevista Pasantía — ${applicant.name}`,
          description: `Entrevista de pasantía universitaria con ${applicant.name} (${applicant.email})`,
          startDateTime,
          durationMinutes: parsed.data.durationMinutes,
          attendeeEmails: [applicant.email],
          addMeetLink: true,
        });
        meetLink = result.meetLink || undefined;
        googleEventId = result.eventId;
      }
    } catch (err) {
      console.error("Failed to create calendar event:", err);
    }
  }

  // Log interview details in applicant notes
  const dateFormatted = new Date(parsed.data.date + "T12:00:00").toLocaleDateString("es-CL", { dateStyle: "long" });
  const noteContent = `Entrevista programada para ${dateFormatted} a las ${parsed.data.time}${meetLink ? ` — Meet: ${meetLink}` : ""}${googleEventId ? ` (Event: ${googleEventId})` : ""}`;

  await db.insert(applicantNotes).values({
    applicantId,
    authorId: session.user.id,
    content: noteContent,
    type: "nota",
  });

  // Send interview email
  try {
    await sendInternInterviewEmail(
      applicant.email,
      applicant.name,
      dateFormatted,
      parsed.data.time,
      meetLink,
    );
  } catch (err) {
    console.error("Failed to send interview email:", err);
  }

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "intern_interview",
    entityId: applicantId,
    details: { date: parsed.data.date, time: parsed.data.time, meetLink, googleEventId },
  });

  revalidatePath(`/rrhh/postulantes/${applicantId}`);
  revalidatePath("/rrhh/postulantes");
  return { success: true, meetLink, googleEventId };
}

// ============================================================
// STATS
// ============================================================

export async function getInternStats() {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) return null;

  const [activeResult, totalResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(interns).where(eq(interns.status, "activo")),
    db.select({ count: sql<number>`count(*)` }).from(interns),
  ]);

  return {
    activeInterns: activeResult[0]?.count ?? 0,
    totalInterns: totalResult[0]?.count ?? 0,
  };
}

// ============================================================
// STAFF LIST (for supervisor selection)
// ============================================================

export async function getStaffForSupervisorSelect() {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) return [];

  return db
    .select({
      id: users.id,
      name: users.name,
      specialty: users.specialty,
      role: users.role,
    })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(users.name);
}
