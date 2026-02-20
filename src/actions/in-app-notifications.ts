"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inAppNotifications } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function getUnreadCount() {
  const session = await auth();
  if (!session?.user) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(inAppNotifications)
    .where(
      and(
        eq(inAppNotifications.userId, session.user.id),
        eq(inAppNotifications.read, false)
      )
    );
  return result[0].count;
}

export async function getNotifications(limit = 20) {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.inAppNotifications.findMany({
    where: eq(inAppNotifications.userId, session.user.id),
    orderBy: [desc(inAppNotifications.createdAt)],
    limit,
  });
}

export async function markAsRead(notificationId: string) {
  const session = await auth();
  if (!session?.user) return;

  await db
    .update(inAppNotifications)
    .set({ read: true })
    .where(
      and(
        eq(inAppNotifications.id, notificationId),
        eq(inAppNotifications.userId, session.user.id)
      )
    );
}

export async function markAllAsRead() {
  const session = await auth();
  if (!session?.user) return;

  await db
    .update(inAppNotifications)
    .set({ read: true })
    .where(
      and(
        eq(inAppNotifications.userId, session.user.id),
        eq(inAppNotifications.read, false)
      )
    );
}

// Internal helper — used by other server actions to create notifications
export async function createInAppNotification(
  userId: string,
  data: {
    type: string;
    title: string;
    body?: string;
    link?: string;
    entityType?: string;
    entityId?: string;
  }
) {
  await db.insert(inAppNotifications).values({
    userId,
    ...data,
  });
}
