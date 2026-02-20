"use server";

import { requireStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import { patients, users, careTeamMembers, appointments, treatmentPlans } from "@/lib/db/schema";
import { eq, and, or, like, isNull, desc, sql, inArray, gte } from "drizzle-orm";
import { patientFormSchema } from "@/lib/validations/patient";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 20;

export async function getPatients(params?: {
  search?: string;
  status?: string;
  page?: number;
}) {
  const session = await requireStaff();

  const page = params?.page || 1;
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [isNull(patients.deletedAt)];

  if (params?.status && params.status !== "all") {
    conditions.push(
      eq(patients.status, params.status as "activo" | "inactivo" | "alta")
    );
  }

  // Therapist scoping: only show connected patients
  if (session.user.role === "terapeuta") {
    const [ctPatients, apptPatients] = await Promise.all([
      db.select({ patientId: careTeamMembers.patientId })
        .from(careTeamMembers)
        .where(eq(careTeamMembers.userId, session.user.id)),
      db.select({ patientId: appointments.patientId })
        .from(appointments)
        .where(eq(appointments.therapistId, session.user.id)),
    ]);

    const connectedIds = [...new Set([
      ...ctPatients.map(r => r.patientId),
      ...apptPatients.map(r => r.patientId),
    ])];

    if (connectedIds.length > 0) {
      conditions.push(
        or(
          eq(patients.primaryTherapistId, session.user.id),
          inArray(patients.id, connectedIds)
        )!
      );
    } else {
      conditions.push(eq(patients.primaryTherapistId, session.user.id));
    }
  }

  if (params?.search) {
    const searchTerm = `%${params.search}%`;
    conditions.push(
      or(
        like(patients.firstName, searchTerm),
        like(patients.lastName, searchTerm),
        like(patients.rut, searchTerm),
        like(patients.email, searchTerm),
        sql`(${patients.firstName} || ' ' || ${patients.lastName}) LIKE ${searchTerm}`,
      )!
    );
  }

  const where = and(...conditions);

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(patients).where(where),
    db.query.patients.findMany({
      where,
      with: {
        primaryTherapist: {
          columns: { id: true, name: true },
        },
      },
      orderBy: [desc(patients.createdAt)],
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  return {
    patients: data,
    total: countResult[0]?.count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / PAGE_SIZE),
  };
}

export async function getPatientsEnriched(params?: {
  search?: string;
  status?: string;
  page?: number;
}) {
  const result = await getPatients(params);
  const patientIds = result.patients.map((p) => p.id);

  if (patientIds.length === 0) return { ...result, patients: [] as typeof enriched };

  const [teamCounts, activePlanCounts, nextAppts, sessionCounts] = await Promise.all([
    db.select({
      patientId: careTeamMembers.patientId,
      count: sql<number>`count(*)`,
    })
      .from(careTeamMembers)
      .where(inArray(careTeamMembers.patientId, patientIds))
      .groupBy(careTeamMembers.patientId),

    db.select({
      patientId: treatmentPlans.patientId,
      count: sql<number>`count(*)`,
    })
      .from(treatmentPlans)
      .where(and(
        inArray(treatmentPlans.patientId, patientIds),
        eq(treatmentPlans.status, "activo")
      ))
      .groupBy(treatmentPlans.patientId),

    db.select({
      patientId: appointments.patientId,
      nextDate: sql<string>`min(${appointments.dateTime})`,
    })
      .from(appointments)
      .where(and(
        inArray(appointments.patientId, patientIds),
        eq(appointments.status, "programada"),
        gte(appointments.dateTime, new Date())
      ))
      .groupBy(appointments.patientId),

    db.select({
      patientId: appointments.patientId,
      count: sql<number>`count(*)`,
    })
      .from(appointments)
      .where(and(
        inArray(appointments.patientId, patientIds),
        eq(appointments.status, "completada")
      ))
      .groupBy(appointments.patientId),
  ]);

  const teamMap = Object.fromEntries(teamCounts.map((r) => [r.patientId, r.count]));
  const planMap = Object.fromEntries(activePlanCounts.map((r) => [r.patientId, r.count]));
  const nextMap = Object.fromEntries(nextAppts.map((r) => [r.patientId, r.nextDate]));
  const sessMap = Object.fromEntries(sessionCounts.map((r) => [r.patientId, r.count]));

  const enriched = result.patients.map((p) => ({
    ...p,
    teamCount: teamMap[p.id] ?? 0,
    activePlans: planMap[p.id] ?? 0,
    nextAppointment: nextMap[p.id] ?? null,
    completedSessions: sessMap[p.id] ?? 0,
  }));

  return { ...result, patients: enriched };
}

export async function getPatientById(id: string) {
  const session = await requireStaff();

  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, id), isNull(patients.deletedAt)),
    with: {
      primaryTherapist: {
        columns: { id: true, name: true },
      },
    },
  });

  return patient;
}

export async function createPatient(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireStaff();

  const raw = Object.fromEntries(formData);
  const parsed = patientFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  const [newPatient] = await db
    .insert(patients)
    .values({
      firstName: data.firstName,
      lastName: data.lastName,
      rut: data.rut || null,
      email: data.email || null,
      phone: data.phone || null,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || null,
      address: data.address || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      emergencyContactRelation: data.emergencyContactRelation || null,
      insuranceProvider: data.insuranceProvider || null,
      insuranceNumber: data.insuranceNumber || null,
      referralSource: data.referralSource || null,
      notes: data.notes || null,
      primaryTherapistId: data.primaryTherapistId || null,
      status: data.status,
    })
    .returning({ id: patients.id });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "patient",
    entityId: newPatient.id,
    details: { name: `${data.firstName} ${data.lastName}` },
  });

  revalidatePath("/pacientes");
  return { success: true, id: newPatient.id };
}

export async function updatePatient(
  id: string,
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireStaff();

  const raw = Object.fromEntries(formData);
  const parsed = patientFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  await db
    .update(patients)
    .set({
      firstName: data.firstName,
      lastName: data.lastName,
      rut: data.rut || null,
      email: data.email || null,
      phone: data.phone || null,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || null,
      address: data.address || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      emergencyContactRelation: data.emergencyContactRelation || null,
      insuranceProvider: data.insuranceProvider || null,
      insuranceNumber: data.insuranceNumber || null,
      referralSource: data.referralSource || null,
      notes: data.notes || null,
      primaryTherapistId: data.primaryTherapistId || null,
      status: data.status,
      updatedAt: new Date(),
    })
    .where(eq(patients.id, id));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "patient",
    entityId: id,
    details: { name: `${data.firstName} ${data.lastName}` },
  });

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
  return { success: true };
}

export async function deletePatient(id: string) {
  const session = await requireStaff();

  // Only admin and terapeuta can delete
  if (!["admin", "terapeuta"].includes(session.user.role)) {
    return { error: "No tiene permisos para eliminar pacientes." };
  }

  // Soft delete
  await db
    .update(patients)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(patients.id, id));

  await logAudit({
    userId: session.user.id,
    action: "delete",
    entityType: "patient",
    entityId: id,
  });

  revalidatePath("/pacientes");
  return { success: true };
}

export async function searchExistingPatients(query: string) {
  await requireStaff();
  if (!query || query.length < 2) return [];

  const q = `%${query}%`;
  return db.query.patients.findMany({
    where: and(
      isNull(patients.deletedAt),
      or(
        like(patients.firstName, q),
        like(patients.lastName, q),
        like(patients.rut, q),
        like(patients.email, q),
        sql`(${patients.firstName} || ' ' || ${patients.lastName}) LIKE ${q}`,
      )
    ),
    with: {
      primaryTherapist: { columns: { id: true, name: true } },
    },
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      rut: true,
      email: true,
      status: true,
    },
    limit: 10,
  });
}

export async function getTherapists() {
  await requireStaff();

  return db.query.users.findMany({
    where: and(
      eq(users.role, "terapeuta"),
      eq(users.active, true)
    ),
    columns: { id: true, name: true, specialty: true, image: true },
    orderBy: (users, { asc }) => [asc(users.name)],
  });
}

// ============================================================
// Bulk actions
// ============================================================

export async function bulkUpdatePatientStatus(
  patientIds: string[],
  status: "activo" | "inactivo" | "alta"
) {
  const session = await requireStaff();
  if (!["admin", "supervisor", "terapeuta"].includes(session.user.role)) return { error: "No tiene permisos." };
  if (patientIds.length === 0) return { error: "Sin pacientes seleccionados." };
  if (!["activo", "inactivo", "alta"].includes(status)) return { error: "Estado inválido." };

  await db.update(patients)
    .set({ status, updatedAt: new Date() })
    .where(and(inArray(patients.id, patientIds), isNull(patients.deletedAt)));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "patient",
    details: { bulkStatusChange: status, count: patientIds.length },
  });

  revalidatePath("/pacientes");
  return { success: true, count: patientIds.length };
}

export async function bulkUpdatePatientTherapist(
  patientIds: string[],
  therapistId: string | null
) {
  const session = await requireStaff();
  if (!["admin", "supervisor", "terapeuta"].includes(session.user.role)) return { error: "No tiene permisos." };
  if (patientIds.length === 0) return { error: "Sin pacientes seleccionados." };

  if (therapistId) {
    const therapist = await db.query.users.findFirst({
      where: and(eq(users.id, therapistId), eq(users.role, "terapeuta"), eq(users.active, true)),
    });
    if (!therapist) return { error: "Terapeuta no encontrado." };
  }

  await db.update(patients)
    .set({ primaryTherapistId: therapistId, updatedAt: new Date() })
    .where(and(inArray(patients.id, patientIds), isNull(patients.deletedAt)));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "patient",
    details: { bulkTherapistChange: therapistId, count: patientIds.length },
  });

  revalidatePath("/pacientes");
  return { success: true, count: patientIds.length };
}
