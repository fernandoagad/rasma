import { auth } from "@/lib/auth";

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
