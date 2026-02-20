"use server";

import { requireStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import { patients, appointments, payments, users, sessionNotes } from "@/lib/db/schema";
import { eq, and, sql, gte, lte, isNull, isNotNull } from "drizzle-orm";

export async function getReportData(params?: { dateFrom?: string; dateTo?: string }) {
  const session = await requireStaff();
  if (!["admin", "supervisor", "rrhh"].includes(session.user.role)) throw new Error("No autorizado.");

  const dateFrom = params?.dateFrom || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const dateTo = params?.dateTo || new Date().toISOString().split("T")[0];

  const dateFromDt = new Date(dateFrom);
  const dateToDt = new Date(dateTo + "T23:59:59");

  // Run ALL queries in parallel — saves ~1.5s vs sequential on remote DB
  const [
    patientResults,
    apptStats,
    revenueResults,
    therapistStats,
    sessionTypeStats,
    therapistDetailedAppts,
    revenuePerTherapist,
    notesPerTherapist,
    activePatientsPerTherapist,
    patientFlowResults,
    referralSourceResults,
  ] = await Promise.all([
    // Patient stats: 2 queries combined into batch
    Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(patients).where(isNull(patients.deletedAt)),
      db.select({ count: sql<number>`count(*)` }).from(patients).where(and(eq(patients.status, "activo"), isNull(patients.deletedAt))),
    ]),

    // Appointment stats: single query with CASE WHEN instead of 4 separate counts
    db.select({
      total: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${appointments.status} = 'completada' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${appointments.status} = 'cancelada' then 1 else 0 end)`,
      noShow: sql<number>`sum(case when ${appointments.status} = 'no_asistio' then 1 else 0 end)`,
    }).from(appointments).where(and(gte(appointments.dateTime, dateFromDt), lte(appointments.dateTime, dateToDt))),

    // Revenue stats: 2 queries in parallel
    Promise.all([
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(payments)
        .where(and(gte(payments.date, dateFrom), lte(payments.date, dateTo), eq(payments.status, "pagado"))),
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(payments)
        .where(and(gte(payments.date, dateFrom), lte(payments.date, dateTo), eq(payments.status, "pendiente"))),
    ]),

    // Therapist workload
    db.select({
      therapistId: appointments.therapistId,
      therapistName: users.name,
      appointmentCount: sql<number>`count(*)`,
    }).from(appointments)
      .innerJoin(users, eq(appointments.therapistId, users.id))
      .where(and(gte(appointments.dateTime, dateFromDt), lte(appointments.dateTime, dateToDt)))
      .groupBy(appointments.therapistId, users.name),

    // Session type breakdown
    db.select({
      sessionType: appointments.sessionType,
      count: sql<number>`count(*)`,
    }).from(appointments)
      .where(and(gte(appointments.dateTime, dateFromDt), lte(appointments.dateTime, dateToDt)))
      .groupBy(appointments.sessionType),

    // 1. Per-therapist detailed appointments: completed/cancelled/noShow/unique patients
    db.select({
      therapistId: appointments.therapistId,
      therapistName: users.name,
      total: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${appointments.status} = 'completada' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${appointments.status} = 'cancelada' then 1 else 0 end)`,
      noShow: sql<number>`sum(case when ${appointments.status} = 'no_asistio' then 1 else 0 end)`,
      uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
    }).from(appointments)
      .innerJoin(users, eq(appointments.therapistId, users.id))
      .where(and(gte(appointments.dateTime, dateFromDt), lte(appointments.dateTime, dateToDt)))
      .groupBy(appointments.therapistId, users.name),

    // 2. Revenue per therapist: payments JOIN appointments, GROUP BY therapistId
    db.select({
      therapistId: appointments.therapistId,
      revenue: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    }).from(payments)
      .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
      .where(and(
        gte(payments.date, dateFrom),
        lte(payments.date, dateTo),
        eq(payments.status, "pagado"),
      ))
      .groupBy(appointments.therapistId),

    // 3. Notes per therapist: sessionNotes JOIN appointments, GROUP BY therapistId
    db.select({
      therapistId: sessionNotes.therapistId,
      notesCount: sql<number>`count(*)`,
    }).from(sessionNotes)
      .innerJoin(appointments, eq(sessionNotes.appointmentId, appointments.id))
      .where(and(gte(appointments.dateTime, dateFromDt), lte(appointments.dateTime, dateToDt)))
      .groupBy(sessionNotes.therapistId),

    // 4. Active patients per therapist: GROUP BY primaryTherapistId
    db.select({
      therapistId: patients.primaryTherapistId,
      activePatients: sql<number>`count(*)`,
    }).from(patients)
      .where(and(
        eq(patients.status, "activo"),
        isNull(patients.deletedAt),
        isNotNull(patients.primaryTherapistId),
      ))
      .groupBy(patients.primaryTherapistId),

    // 5. Patient flow: new patients in period vs total active
    Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(patients)
        .where(and(
          gte(patients.createdAt, dateFromDt),
          lte(patients.createdAt, dateToDt),
          isNull(patients.deletedAt),
        )),
      db.select({ count: sql<number>`count(*)` }).from(patients)
        .where(and(eq(patients.status, "activo"), isNull(patients.deletedAt))),
    ]),

    // 6. Top referral sources: GROUP BY referralSource, ORDER BY count DESC, LIMIT 10
    db.select({
      source: patients.referralSource,
      count: sql<number>`count(*)`,
    }).from(patients)
      .where(and(
        isNull(patients.deletedAt),
        isNotNull(patients.referralSource),
      ))
      .groupBy(patients.referralSource)
      .orderBy(sql`count(*) desc`)
      .limit(10),
  ]);

  const [[totalPatients], [activePatients]] = patientResults;
  const [apptRow] = apptStats;
  const [[totalRevenue], [pendingRevenue]] = revenueResults;

  // Build lookup maps for per-therapist merging
  const revenueMap = new Map(revenuePerTherapist.map(r => [r.therapistId, r.revenue]));
  const notesMap = new Map(notesPerTherapist.map(n => [n.therapistId, n.notesCount]));
  const activePatientsMap = new Map(activePatientsPerTherapist.map(a => [a.therapistId!, a.activePatients]));

  // Merge per-therapist data into combined array
  const therapistDetailStats = therapistDetailedAppts.map(t => {
    const completed = t.completed ?? 0;
    const total = t.total ?? 0;
    const noShow = t.noShow ?? 0;
    const notesCount = notesMap.get(t.therapistId) ?? 0;

    return {
      id: t.therapistId,
      name: t.therapistName,
      appointments: total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
      revenue: (revenueMap.get(t.therapistId) ?? 0) / 100,
      activePatients: activePatientsMap.get(t.therapistId) ?? 0,
      notesCount,
      notesRate: completed > 0 ? Math.round((notesCount / completed) * 100) : 0,
    };
  });

  // Patient flow
  const [[newPatientsRow], [totalActiveRow]] = patientFlowResults;
  const patientFlow = {
    newPatients: newPatientsRow.count,
    totalActive: totalActiveRow.count,
  };

  // Referral sources
  const referralSources = referralSourceResults.map(r => ({
    source: r.source ?? "Sin especificar",
    count: r.count,
  }));

  return {
    dateFrom,
    dateTo,
    patients: { total: totalPatients.count, active: activePatients.count },
    appointments: {
      total: apptRow.total,
      completed: apptRow.completed ?? 0,
      cancelled: apptRow.cancelled ?? 0,
      noShow: apptRow.noShow ?? 0,
      completionRate: apptRow.total > 0 ? Math.round(((apptRow.completed ?? 0) / apptRow.total) * 100) : 0,
    },
    revenue: {
      collected: totalRevenue.total / 100,
      pending: pendingRevenue.total / 100,
    },
    therapistStats,
    sessionTypeStats,
    therapistDetailStats,
    patientFlow,
    referralSources,
  };
}
