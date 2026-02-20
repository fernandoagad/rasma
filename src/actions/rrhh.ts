"use server";

import { requireRole } from "@/lib/authorization";
import { db } from "@/lib/db";
import { users, patients, appointments, applicants } from "@/lib/db/schema";
import { eq, sql, gte, and } from "drizzle-orm";

export async function getHRDashboardStats() {
  await requireRole(["admin", "rrhh"]);

  const [totalApplicantsResult, newApplicantsResult, teamSizeResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(applicants),
    db.select({ count: sql<number>`count(*)` }).from(applicants).where(eq(applicants.status, "nuevo")),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.active, true)),
  ]);

  return {
    totalApplicants: totalApplicantsResult[0]?.count ?? 0,
    newApplicants: newApplicantsResult[0]?.count ?? 0,
    teamSize: teamSizeResult[0]?.count ?? 0,
  };
}

export async function getTeamOverview(params?: { role?: string; area?: string; status?: string }) {
  await requireRole(["admin", "rrhh"]);

  const allUsers = await db.query.users.findMany({
    columns: {
      id: true, name: true, email: true, role: true, active: true,
      specialty: true, area: true, therapistStatus: true, attentionType: true,
      image: true, createdAt: true,
    },
    orderBy: [users.name],
  });

  // Apply filters
  let filtered = allUsers;
  if (params?.role && params.role !== "all") {
    filtered = filtered.filter(u => u.role === params.role);
  }
  if (params?.area && params.area !== "all") {
    filtered = filtered.filter(u => u.area === params.area);
  }
  if (params?.status && params.status !== "all") {
    if (params.status === "active") filtered = filtered.filter(u => u.active);
    else if (params.status === "inactive") filtered = filtered.filter(u => !u.active);
  }

  // Get counts for each user
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const enriched = await Promise.all(
    filtered.map(async (user) => {
      const [apptCount, patientCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` })
          .from(appointments)
          .where(and(eq(appointments.therapistId, user.id), gte(appointments.dateTime, thirtyDaysAgo))),
        db.select({ count: sql<number>`count(*)` })
          .from(patients)
          .where(and(eq(patients.primaryTherapistId, user.id), eq(patients.status, "activo"))),
      ]);
      return {
        ...user,
        recentAppointments: apptCount[0]?.count ?? 0,
        activePatients: patientCount[0]?.count ?? 0,
      };
    })
  );

  return enriched;
}
