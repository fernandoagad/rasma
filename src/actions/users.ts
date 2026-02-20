"use server";

import { requireRole } from "@/lib/authorization";
import { db } from "@/lib/db";
import { users, patients, careTeamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createUserSchema, updateUserSchema } from "@/lib/validations/user";
import { logAudit } from "@/lib/audit";
import { sendWelcomeEmail, sendAdminPasswordResetEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

export async function getUsers(params?: { area?: string; status?: string }) {
  const session = await requireRole(["admin"]);

  const conditions = [];
  if (params?.area && params.area !== "all") {
    conditions.push(eq(users.area, params.area));
  }
  if (params?.status && params.status !== "all") {
    conditions.push(
      eq(
        users.therapistStatus,
        params.status as "evaluando" | "disponible" | "completo"
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db.query.users.findMany({
    where,
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      specialty: true,
      area: true,
      therapistStatus: true,
      attentionType: true,
      image: true,
      createdAt: true,
    },
    orderBy: (users, { asc }) => [asc(users.name)],
  });
}

export async function createUser(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireRole(["admin"]);

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    specialty: formData.get("specialty") || undefined,
    area: formData.get("area") || undefined,
    therapistStatus: formData.get("therapistStatus") || undefined,
    attentionType: formData.get("attentionType") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check if email already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email.toLowerCase()),
  });
  if (existing) {
    return { error: "Este correo electrónico ya está en uso." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const [newUser] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: parsed.data.role,
      specialty: parsed.data.specialty,
      area: parsed.data.area,
      therapistStatus: parsed.data.therapistStatus,
      attentionType: parsed.data.attentionType,
    })
    .returning({ id: users.id });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "user",
    entityId: newUser.id,
    details: { name: parsed.data.name, role: parsed.data.role },
  });

  // Send welcome email with credentials (non-blocking)
  sendWelcomeEmail(
    parsed.data.email.toLowerCase(),
    parsed.data.name,
    parsed.data.role,
    parsed.data.password
  ).catch(() => {});

  revalidatePath("/configuracion/usuarios");
  return { success: true };
}

export async function updateUser(
  id: string,
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireRole(["admin"]);

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    active: formData.get("active") === "true",
    specialty: formData.get("specialty") || undefined,
    area: formData.get("area") || undefined,
    therapistStatus: formData.get("therapistStatus") || undefined,
    attentionType: formData.get("attentionType") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check email uniqueness (excluding current user)
  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email.toLowerCase()),
  });
  if (existing && existing.id !== id) {
    return { error: "Este correo electrónico ya está en uso." };
  }

  await db
    .update(users)
    .set({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      active: parsed.data.active,
      specialty: parsed.data.specialty ?? null,
      area: parsed.data.area ?? null,
      therapistStatus: parsed.data.therapistStatus ?? null,
      attentionType: parsed.data.attentionType ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "user",
    entityId: id,
    details: parsed.data,
  });

  revalidatePath("/configuracion/usuarios");
  return { success: true };
}

export async function adminResetPassword(userId: string) {
  const session = await requireRole(["admin"]);

  // Generate a temporary password
  const tempPassword = crypto.randomUUID().slice(0, 12);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await logAudit({
    userId: session.user.id,
    action: "admin_password_reset",
    entityType: "user",
    entityId: userId,
  });

  // Send temp password email (non-blocking)
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, name: true },
  });
  if (targetUser?.email) {
    sendAdminPasswordResetEmail(targetUser.email, targetUser.name, tempPassword).catch(() => {});
  }

  return { success: true, tempPassword };
}

// Bulk operations for admin
export async function bulkUpdateUsers(
  userIds: string[],
  updates: {
    role?: "admin" | "terapeuta" | "recepcionista" | "supervisor" | "rrhh" | "paciente" | "invitado";
    area?: string;
    therapistStatus?: "evaluando" | "disponible" | "completo";
    active?: boolean;
  }
) {
  const session = await requireRole(["admin"]);

  if (userIds.length === 0) return { error: "No se seleccionaron usuarios." };

  for (const userId of userIds) {
    await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  await logAudit({
    userId: session.user.id,
    action: "bulk_update",
    entityType: "user",
    details: { userIds, updates },
  });

  revalidatePath("/configuracion/usuarios");
  return { success: true };
}

export async function deactivateUser(userId: string) {
  const session = await requireRole(["admin"]);

  if (userId === session.user.id) {
    return { error: "No puede desactivarse a sí mismo." };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, active: true },
  });
  if (!target) return { error: "Usuario no encontrado." };
  if (!target.active) return { error: "El usuario ya está inactivo." };

  await db
    .update(users)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Cleanup: unassign as primary therapist
  await db
    .update(patients)
    .set({ primaryTherapistId: null, updatedAt: new Date() })
    .where(eq(patients.primaryTherapistId, userId));

  // Cleanup: remove from care teams
  await db
    .delete(careTeamMembers)
    .where(eq(careTeamMembers.userId, userId));

  await logAudit({
    userId: session.user.id,
    action: "deactivate",
    entityType: "user",
    entityId: userId,
    details: { targetName: target.name },
  });

  revalidatePath("/configuracion/usuarios");
  revalidatePath("/rrhh/equipo");
  return { success: true };
}
