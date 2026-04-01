"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Start impersonating a role or a specific user.
 * Only admins can do this. Sets a cookie that the JWT callback reads.
 */
export async function startImpersonation(data: {
  role?: string;
  userId?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado." };

  // Check real role — either from session or from DB
  const realRole = session.user.realRole || session.user.role;
  if (realRole !== "admin") return { error: "Solo administradores pueden usar esta funcion." };

  let targetRole = data.role;
  let targetLinkedPatientId: string | null = null;
  let targetUserId: string | null = null;

  // If impersonating a specific user, get their role
  if (data.userId) {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, data.userId),
      columns: { id: true, role: true, linkedPatientId: true },
    });
    if (!targetUser) return { error: "Usuario no encontrado." };
    targetRole = targetUser.role;
    targetLinkedPatientId = targetUser.linkedPatientId;
    targetUserId = targetUser.id;
  }

  if (!targetRole) return { error: "Debe especificar un rol o usuario." };

  // Store impersonation state in a secure cookie
  const cookieStore = await cookies();
  cookieStore.set("impersonate", JSON.stringify({
    role: targetRole,
    userId: targetUserId,
    linkedPatientId: targetLinkedPatientId,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour max
  });

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Stop impersonating — return to admin view.
 */
export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete("impersonate");
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Get list of users for the impersonation dropdown.
 */
export async function getImpersonatableUsers() {
  const session = await auth();
  if (!session?.user) return [];
  const realRole = session.user.realRole || session.user.role;
  if (realRole !== "admin") return [];

  return db.query.users.findMany({
    where: eq(users.active, true),
    columns: { id: true, name: true, email: true, role: true },
    orderBy: (u, { asc }) => [asc(u.name)],
    limit: 50,
  });
}
