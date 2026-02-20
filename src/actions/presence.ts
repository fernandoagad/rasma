"use server";

import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import { userPresence, users } from "@/lib/db/schema";
import { eq, gte } from "drizzle-orm";

export async function heartbeat() {
  const session = await auth();
  if (!session?.user) return;
  if (!isStaff(session.user.role)) return;

  const now = new Date();

  // Upsert presence
  const existing = await db.query.userPresence.findFirst({
    where: eq(userPresence.userId, session.user.id),
  });

  if (existing) {
    await db
      .update(userPresence)
      .set({ lastSeen: now, status: "online" })
      .where(eq(userPresence.userId, session.user.id));
  } else {
    await db.insert(userPresence).values({
      userId: session.user.id,
      lastSeen: now,
      status: "online",
    });
  }
}

export async function getOnlineUsers() {
  const session = await auth();
  if (!session?.user) return [];

  // Users active in the last 2 minutes
  const threshold = new Date(Date.now() - 2 * 60 * 1000);

  const online = await db.query.userPresence.findMany({
    where: gte(userPresence.lastSeen, threshold),
  });

  if (online.length === 0) return [];

  const onlineUserIds = online.map((p) => p.userId);

  const onlineUsers = await db.query.users.findMany({
    columns: { id: true, name: true, image: true },
  });

  return onlineUsers
    .filter((u) => onlineUserIds.includes(u.id) && u.id !== session.user.id)
    .slice(0, 5);
}
