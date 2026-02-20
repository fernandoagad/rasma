"use server";

import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import {
  loginSchema,
  resetRequestSchema,
  resetPasswordSchema,
  registerSchema,
} from "@/lib/validations/auth";
import { sendPasswordResetCode, sendPasswordChangedNotification } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { AuthError } from "next-auth";

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/" });
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateCode(): string {
  const bytes = randomBytes(3);
  const num = (bytes[0] * 65536 + bytes[1] * 256 + bytes[2]) % 1000000;
  return String(num).padStart(6, "0");
}

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.message?.includes("RATE_LIMITED")) {
        return {
          error:
            "Demasiados intentos fallidos. Intente de nuevo en 15 minutos.",
        };
      }
      return { error: "Credenciales invalidas. Intente de nuevo." };
    }
    return { error: "Ocurrio un error. Intente de nuevo." };
  }
}

export async function logoutAction() {
  await signOut({ redirect: false });
}

// ── Registration ──

export async function registerAction(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  const existing = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (existing) {
    return { error: "Ya existe una cuenta con este correo electronico." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.insert(users).values({
    name: parsed.data.name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "recepcionista",
    authProvider: "credentials",
  });

  return { success: true };
}

// ── Code-based password recovery ──

export async function requestPasswordResetCode(email: string) {
  const parsed = resetRequestSchema.safeParse({ email });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  // Always return success to prevent email enumeration
  if (!user || !user.active) {
    return { success: true };
  }

  const code = generateCode();
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: codeHash,
    expiresAt,
  });

  await sendPasswordResetCode(normalizedEmail, code);

  await logAudit({
    userId: user.id,
    action: "password_reset_request",
    entityType: "user",
    entityId: user.id,
  });

  return { success: true };
}

export async function verifyResetCode(email: string, code: string) {
  if (!code || code.length !== 6) {
    return { error: "Ingrese el codigo de 6 digitos." };
  }

  const normalizedEmail = email.toLowerCase();
  const codeHash = hashToken(code);

  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
    columns: { id: true },
  });

  if (!user) {
    return { error: "Codigo invalido o expirado." };
  }

  const tokenRecord = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.userId, user.id),
      eq(passwordResetTokens.tokenHash, codeHash),
      isNull(passwordResetTokens.usedAt)
    ),
  });

  if (!tokenRecord) {
    return { error: "Codigo invalido o expirado." };
  }

  if (tokenRecord.expiresAt < new Date()) {
    return { error: "El codigo ha expirado. Solicite uno nuevo." };
  }

  return { success: true, tokenId: tokenRecord.id };
}

export async function resetPasswordWithCode(
  email: string,
  code: string,
  password: string,
  confirmPassword: string
) {
  if (password.length < 8) {
    return { error: "La contrasena debe tener al menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "Las contrasenas no coinciden." };
  }

  const normalizedEmail = email.toLowerCase();
  const codeHash = hashToken(code);

  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
    columns: { id: true, name: true, email: true },
  });

  if (!user) {
    return { error: "Codigo invalido o expirado." };
  }

  const tokenRecord = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.userId, user.id),
      eq(passwordResetTokens.tokenHash, codeHash),
      isNull(passwordResetTokens.usedAt)
    ),
  });

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    return { error: "Codigo invalido o expirado. Solicite uno nuevo." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenRecord.id));

  await logAudit({
    userId: user.id,
    action: "password_reset",
    entityType: "user",
    entityId: user.id,
  });

  if (user.email) {
    sendPasswordChangedNotification(user.email, user.name).catch(() => {});
  }

  return { success: true };
}

// ── Legacy token-based reset (keeps [token] route working) ──

export async function requestPasswordReset(
  _prevState: { message?: string; error?: string } | undefined,
  formData: FormData
) {
  const email = (formData.get("email") as string || "").toLowerCase();
  const result = await requestPasswordResetCode(email);
  if (result.error) return { error: result.error };
  return { message: "Si el correo existe en nuestro sistema, recibira un codigo de verificacion." };
}

export async function resetPassword(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const tokenHash = hashToken(parsed.data.token);

  const tokenRecord = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt)
    ),
  });

  if (!tokenRecord) {
    return { error: "El enlace de recuperacion no es valido." };
  }

  if (tokenRecord.expiresAt < new Date()) {
    return { error: "El enlace de recuperacion ha expirado. Solicite uno nuevo." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, tokenRecord.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenRecord.id));

  await logAudit({
    userId: tokenRecord.userId,
    action: "password_reset",
    entityType: "user",
    entityId: tokenRecord.userId,
  });

  const resetUser = await db.query.users.findFirst({
    where: eq(users.id, tokenRecord.userId),
    columns: { email: true, name: true },
  });
  if (resetUser?.email) {
    sendPasswordChangedNotification(resetUser.email, resetUser.name).catch(() => {});
  }

  return { success: true };
}
