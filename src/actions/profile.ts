"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, emailChangeRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import {
  changePasswordSchema,
  changeEmailSchema,
} from "@/lib/validations/auth";
import { sendEmailChangeVerification, sendPasswordChangedNotification } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function updateName(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "No autorizado." };
  }

  const name = formData.get("name") as string;
  if (!name || name.trim().length < 2) {
    return { error: "El nombre debe tener al menos 2 caracteres." };
  }

  await db
    .update(users)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "user",
    entityId: session.user.id,
    details: { field: "name" },
  });

  revalidatePath("/perfil");
  return { success: true };
}

export async function changePassword(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "No autorizado." };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return { error: "Usuario no encontrado." };
  }

  if (!user.passwordHash) {
    return { error: "Esta cuenta usa Google para iniciar sesión. No puede cambiar la contraseña aquí." };
  }

  const passwordMatch = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!passwordMatch) {
    return { error: "La contraseña actual es incorrecta." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  await logAudit({
    userId: session.user.id,
    action: "password_change",
    entityType: "user",
    entityId: session.user.id,
  });

  // Notify user that password was changed (non-blocking)
  if (user.email) {
    sendPasswordChangedNotification(user.email, user.name).catch(() => {});
  }

  revalidatePath("/perfil");
  return { success: true };
}

export async function requestEmailChange(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "No autorizado." };
  }

  const parsed = changeEmailSchema.safeParse({
    newEmail: formData.get("newEmail"),
    currentPassword: formData.get("currentPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return { error: "Usuario no encontrado." };
  }

  if (!user.passwordHash) {
    return { error: "Esta cuenta usa Google para iniciar sesión. No puede cambiar la contraseña aquí." };
  }

  const passwordMatch = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!passwordMatch) {
    return { error: "La contraseña es incorrecta." };
  }

  // Check if new email is already in use
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.newEmail.toLowerCase()),
  });
  if (existingUser) {
    return { error: "Este correo electrónico ya está en uso." };
  }

  // Generate verification token
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(emailChangeRequests).values({
    userId: session.user.id,
    newEmail: parsed.data.newEmail.toLowerCase(),
    tokenHash,
    expiresAt,
  });

  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${rawToken}`;
  await sendEmailChangeVerification(parsed.data.newEmail, verifyUrl);

  await logAudit({
    userId: session.user.id,
    action: "email_change_request",
    entityType: "user",
    entityId: session.user.id,
    details: { newEmail: parsed.data.newEmail },
  });

  return { success: true };
}
