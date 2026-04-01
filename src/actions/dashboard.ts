"use server";

import { requireStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import { patients, appointments, payments, sessionNotes, auditLog, users } from "@/lib/db/schema";
import { eq, and, sql, gte, lte, isNull, desc, or } from "drizzle-orm";

/**
 * Fetch ALL dashboard data in a single auth check.
 * Reduces 4 separate auth() calls to 1.
 */
export async function getDashboardBundle(activityLimit = 8, upcomingLimit = 5) {
  const session = await requireStaff();
  const role = session.user.role;
  const userId = session.user.id;

  const [stats, activities, upcoming, todayAppts] = await Promise.all([
    _getDashboardStats(role, userId),
    _getRecentActivity(role, userId, activityLimit),
    _getUpcomingAppointments(role, userId, upcomingLimit),
    _getTodayAppointments(role, userId),
  ]);

  return { stats, activities, upcoming, todayAppts };
}

export async function getDashboardStats() {
  const session = await requireStaff();
  return _getDashboardStats(session.user.role, session.user.id);
}

async function _getDashboardStats(role: string, userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isTherapist = role === "terapeuta";

  // Build therapist-scoped conditions
  const todayApptConditions = [
    gte(appointments.dateTime, today),
    lte(appointments.dateTime, tomorrow),
    eq(appointments.status, "programada"),
  ];
  if (isTherapist) todayApptConditions.push(eq(appointments.therapistId, userId));

  const pendingNotesConditions = [
    eq(appointments.status, "completada"),
    isNull(sessionNotes.id),
  ];
  if (isTherapist) pendingNotesConditions.push(eq(appointments.therapistId, userId));

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekApptConditions = [
    gte(appointments.dateTime, weekStart),
    lte(appointments.dateTime, weekEnd),
  ];
  if (isTherapist) weekApptConditions.push(eq(appointments.therapistId, userId));

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
          .where(and(eq(appointments.therapistId, userId), isNull(patients.deletedAt)))
      : db.select({ count: sql<number>`count(*)` }).from(patients).where(isNull(patients.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(appointments).where(and(...todayApptConditions)),
    isTherapist
      ? Promise.resolve([{ count: 0 }])
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
          ...(isTherapist ? [eq(appointments.therapistId, userId)] : []),
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
  const session = await requireStaff();
  return _getRecentActivity(session.user.role, session.user.id, limit);
}

async function _getRecentActivity(role: string, userId: string, limit: number) {
  const conditions = [];
  if (role === "terapeuta") {
    conditions.push(eq(auditLog.userId, userId));
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
  const session = await requireStaff();
  return _getUpcomingAppointments(session.user.role, session.user.id, limit);
}

async function _getUpcomingAppointments(role: string, userId: string, limit: number) {
  const now = new Date();
  const conditions = [
    gte(appointments.dateTime, now),
    eq(appointments.status, "programada"),
  ];

  if (role === "terapeuta") {
    conditions.push(eq(appointments.therapistId, userId));
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
  const session = await requireStaff();
  return _getTodayAppointments(session.user.role, session.user.id);
}

async function _getTodayAppointments(role: string, userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const conditions = [
    gte(appointments.dateTime, today),
    lte(appointments.dateTime, tomorrow),
  ];

  if (role === "terapeuta") {
    conditions.push(eq(appointments.therapistId, userId));
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
