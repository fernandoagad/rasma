"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appointments, payments, sessionNotes, treatmentPlans, users, patients, careTeamMembers } from "@/lib/db/schema";
import { eq, and, desc, sql, isNull, gte } from "drizzle-orm";

export async function getPatientSummary(patientId: string) {
  const now = new Date();

  const [
    activePlanResult,
    nextApptResult,
    completedResult,
    pendingNotesResult,
    teamCountResult,
  ] = await Promise.all([
    db.select({
      count: sql<number>`count(*)`,
      latestDiagnosis: sql<string | null>`max(${treatmentPlans.diagnosis})`,
    })
      .from(treatmentPlans)
      .where(and(
        eq(treatmentPlans.patientId, patientId),
        eq(treatmentPlans.status, "activo")
      )),

    db.select({
      id: appointments.id,
      dateTime: appointments.dateTime,
      therapistName: users.name,
    })
      .from(appointments)
      .innerJoin(users, eq(appointments.therapistId, users.id))
      .where(and(
        eq(appointments.patientId, patientId),
        eq(appointments.status, "programada"),
        gte(appointments.dateTime, now)
      ))
      .orderBy(appointments.dateTime)
      .limit(1),

    db.select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(
        eq(appointments.patientId, patientId),
        eq(appointments.status, "completada")
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(appointments)
      .leftJoin(sessionNotes, eq(appointments.id, sessionNotes.appointmentId))
      .where(and(
        eq(appointments.patientId, patientId),
        eq(appointments.status, "completada"),
        isNull(sessionNotes.id)
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(careTeamMembers)
      .where(eq(careTeamMembers.patientId, patientId)),
  ]);

  return {
    activePlans: activePlanResult[0]?.count ?? 0,
    latestDiagnosis: activePlanResult[0]?.latestDiagnosis ?? null,
    nextAppointment: nextApptResult[0] ?? null,
    completedSessions: completedResult[0]?.count ?? 0,
    pendingNotes: pendingNotesResult[0]?.count ?? 0,
    teamCount: teamCountResult[0]?.count ?? 0,
  };
}

export async function getPatientAppointments(patientId: string) {
  return db
    .select({
      id: appointments.id,
      dateTime: appointments.dateTime,
      durationMinutes: appointments.durationMinutes,
      status: appointments.status,
      sessionType: appointments.sessionType,
      modality: appointments.modality,
      therapistName: users.name,
      hasNote: sql<boolean>`case when ${sessionNotes.id} is not null then 1 else 0 end`,
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.therapistId, users.id))
    .leftJoin(sessionNotes, eq(appointments.id, sessionNotes.appointmentId))
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(appointments.dateTime))
    .limit(50);
}

export async function getPatientPayments(patientId: string) {
  return db
    .select({
      id: payments.id,
      amount: payments.amount,
      status: payments.status,
      paymentMethod: payments.paymentMethod,
      date: payments.date,
    })
    .from(payments)
    .where(eq(payments.patientId, patientId))
    .orderBy(desc(payments.date))
    .limit(20);
}

export async function getPatientNotes(patientId: string) {
  return db
    .select({
      id: sessionNotes.id,
      createdAt: sessionNotes.createdAt,
      therapistName: users.name,
      appointmentDate: appointments.dateTime,
      appointmentId: appointments.id,
      sessionType: appointments.sessionType,
      modality: appointments.modality,
    })
    .from(sessionNotes)
    .innerJoin(appointments, eq(sessionNotes.appointmentId, appointments.id))
    .innerJoin(users, eq(sessionNotes.therapistId, users.id))
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(sessionNotes.createdAt))
    .limit(50);
}

export async function getPatientPlans(patientId: string) {
  return db.query.treatmentPlans.findMany({
    where: eq(treatmentPlans.patientId, patientId),
    with: {
      therapist: { columns: { id: true, name: true } },
      tasks: { orderBy: (t, { asc }) => [asc(t.sortOrder)] },
    },
    orderBy: [desc(treatmentPlans.createdAt)],
    limit: 10,
  });
}
