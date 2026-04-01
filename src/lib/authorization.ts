import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { patients, careTeamMembers } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";

export const STAFF_ROLES = ["admin", "terapeuta", "recepcionista", "supervisor", "rrhh"] as const;
export const CLINICAL_ROLES = ["admin", "terapeuta", "supervisor"] as const;

export function isStaff(role: string | undefined | null): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

export function isClinical(role: string | undefined | null): boolean {
  return !!role && (CLINICAL_ROLES as readonly string[]).includes(role);
}

export async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");
  if (!isStaff(session.user.role)) throw new Error("Acceso denegado.");
  return session;
}

export async function requireRole(roles: readonly string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");
  if (!roles.includes(session.user.role)) throw new Error("Acceso denegado.");
  return session;
}

/**
 * Check if a therapist can access a specific patient.
 * Non-therapist staff can access all patients.
 * Therapists can only access patients where they are:
 * - The primary therapist, OR
 * - A member of the care team
 */
export async function requirePatientAccess(session: { user: { id: string; role: string } }, patientId: string) {
  if (session.user.role !== "terapeuta") return; // non-therapists have full access

  const [isPrimary, isTeamMember] = await Promise.all([
    db.query.patients.findFirst({
      where: and(eq(patients.id, patientId), eq(patients.primaryTherapistId, session.user.id)),
      columns: { id: true },
    }),
    db.query.careTeamMembers.findFirst({
      where: and(eq(careTeamMembers.patientId, patientId), eq(careTeamMembers.userId, session.user.id)),
      columns: { id: true },
    }),
  ]);

  if (!isPrimary && !isTeamMember) {
    throw new Error("No tiene acceso a este paciente.");
  }
}
