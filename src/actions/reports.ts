"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { patients, appointments, payments, users } from "@/lib/db/schema";
import { eq, and, sql, gte, lte, isNull } from "drizzle-orm";

export async function getReportData(params?: { dateFrom?: string; dateTo?: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");
  if (!["admin", "supervisor"].includes(session.user.role)) throw new Error("No autorizado.");

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
  ]);

  const [[totalPatients], [activePatients]] = patientResults;
  const [apptRow] = apptStats;
  const [[totalRevenue], [pendingRevenue]] = revenueResults;

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
  };
}
