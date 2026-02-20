"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { patients, appointments, payments, sessionNotes, auditLog, users } from "@/lib/db/schema";
import { eq, and, sql, gte, lte, isNull, desc, or } from "drizzle-orm";

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isTherapist = session.user.role === "terapeuta";

  // Build therapist-scoped conditions
  const todayApptConditions = [
    gte(appointments.dateTime, today),
    lte(appointments.dateTime, tomorrow),
    eq(appointments.status, "programada"),
  ];
  if (isTherapist) todayApptConditions.push(eq(appointments.therapistId, session.user.id));

  const pendingNotesConditions = [
    eq(appointments.status, "completada"),
    isNull(sessionNotes.id),
  ];
  if (isTherapist) pendingNotesConditions.push(eq(appointments.therapistId, session.user.id));

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekApptConditions = [
    gte(appointments.dateTime, weekStart),
    lte(appointments.dateTime, weekEnd),
  ];
  if (isTherapist) weekApptConditions.push(eq(appointments.therapistId, session.user.id));

  const [
    patientCountResult,
    todayApptsResult,
    pendingPaymentsResult,
    notesWithoutSessionResult,
    weekApptsResult,
    completedThisWeekResult,
  ] = await Promise.all([
    isTherapist
      ? db.select({ count: sql<number>`count(distinct ${patients.id})` })
          .from(appointments)
          .innerJoin(patients, eq(appointments.patientId, patients.id))
          .where(and(eq(appointments.therapistId, session.user.id), isNull(patients.deletedAt)))
      : db.select({ count: sql<number>`count(*)` }).from(patients).where(isNull(patients.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(appointments).where(and(...todayApptConditions)),
    isTherapist
      ? Promise.resolve([{ count: 0 }]) // Therapists don't see payments
      : db.select({ count: sql<number>`count(*)` }).from(payments).where(eq(payments.status, "pendiente")),
    db.select({ count: sql<number>`count(*)` })
      .from(appointments)
      .leftJoin(sessionNotes, eq(appointments.id, sessionNotes.appointmentId))
      .where(and(...pendingNotesConditions)),
    db.select({ count: sql<number>`count(*)` }).from(appointments).where(and(...weekApptConditions)),
    db.select({ count: sql<number>`count(*)` }).from(appointments).where(
      and(
        ...[
          gte(appointments.dateTime, weekStart),
          lte(appointments.dateTime, weekEnd),
          eq(appointments.status, "completada"),
          ...(isTherapist ? [eq(appointments.therapistId, session.user.id)] : []),
        ]
      )
    ),
  ]);

  return {
    patientCount: patientCountResult[0]?.count ?? 0,
    todayAppointments: todayApptsResult[0]?.count ?? 0,
    pendingPayments: pendingPaymentsResult[0]?.count ?? 0,
    pendingNotes: notesWithoutSessionResult[0]?.count ?? 0,
    weekAppointments: weekApptsResult[0]?.count ?? 0,
    completedThisWeek: completedThisWeekResult[0]?.count ?? 0,
  };
}

export async function getRecentActivity(limit = 10) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  const conditions = [];
  if (session.user.role === "terapeuta") {
    conditions.push(eq(auditLog.userId, session.user.id));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
      userName: users.name,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function getUpcomingAppointments(limit = 8) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  const now = new Date();
  const conditions = [
    gte(appointments.dateTime, now),
    eq(appointments.status, "programada"),
  ];

  if (session.user.role === "terapeuta") {
    conditions.push(eq(appointments.therapistId, session.user.id));
  }

  return db
    .select({
      id: appointments.id,
      dateTime: appointments.dateTime,
      durationMinutes: appointments.durationMinutes,
      sessionType: appointments.sessionType,
      modality: appointments.modality,
      meetingLink: appointments.meetingLink,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      therapistName: users.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(users, eq(appointments.therapistId, users.id))
    .where(and(...conditions))
    .orderBy(appointments.dateTime)
    .limit(limit);
}

export async function getTodayAppointments() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const conditions = [
    gte(appointments.dateTime, today),
    lte(appointments.dateTime, tomorrow),
  ];

  if (session.user.role === "terapeuta") {
    conditions.push(eq(appointments.therapistId, session.user.id));
  }

  return db
    .select({
      id: appointments.id,
      dateTime: appointments.dateTime,
      durationMinutes: appointments.durationMinutes,
      status: appointments.status,
      sessionType: appointments.sessionType,
      modality: appointments.modality,
      meetingLink: appointments.meetingLink,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      therapistName: users.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(users, eq(appointments.therapistId, users.id))
    .where(and(...conditions))
    .orderBy(appointments.dateTime);
}
