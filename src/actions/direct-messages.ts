"use server";

import { requireStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import { directMessages, users } from "@/lib/db/schema";
import { eq, and, or, desc, like } from "drizzle-orm";
import { createInAppNotification } from "@/actions/in-app-notifications";

// Get all DM threads for the current user (latest message per unique partner)
export async function getDirectMessageThreads() {
  const session = await requireStaff();

  // Get all messages involving this user, ordered by most recent
  const allDMs = await db.query.directMessages.findMany({
    where: or(
      eq(directMessages.senderId, session.user.id),
      eq(directMessages.recipientId, session.user.id)
    ),
    with: {
      sender: { columns: { id: true, name: true, image: true } },
      recipient: { columns: { id: true, name: true, image: true } },
    },
    orderBy: [desc(directMessages.createdAt)],
  });

  // Group by partner, keep only the latest message per partner
  const threadMap = new Map<string, typeof allDMs[number]>();
  for (const dm of allDMs) {
    const partnerId = dm.senderId === session.user.id ? dm.recipientId : dm.senderId;
    if (!threadMap.has(partnerId)) {
      threadMap.set(partnerId, dm);
    }
  }

  return Array.from(threadMap.entries()).map(([partnerId, dm]) => {
    const partner = dm.senderId === session.user.id ? dm.recipient : dm.sender;
    return {
      partnerId,
      partner,
      lastMessage: {
        content: dm.content,
        createdAt: dm.createdAt,
        isFromMe: dm.senderId === session.user.id,
      },
      unread: dm.recipientId === session.user.id && !dm.readAt,
    };
  });
}

// Get messages between current user and a partner
export async function getDirectMessages(partnerId: string, limit = 50) {
  const session = await requireStaff();

  const msgs = await db.query.directMessages.findMany({
    where: or(
      and(eq(directMessages.senderId, session.user.id), eq(directMessages.recipientId, partnerId)),
      and(eq(directMessages.senderId, partnerId), eq(directMessages.recipientId, session.user.id))
    ),
    with: {
      sender: { columns: { id: true, name: true, image: true } },
    },
    orderBy: [desc(directMessages.createdAt)],
    limit,
  });

  // Mark unread messages as read
  const unreadIds = msgs
    .filter((m) => m.recipientId === session.user.id && !m.readAt)
    .map((m) => m.id);
  if (unreadIds.length > 0) {
    // We can't use inArray easily here, so update one by one or use a raw update
    for (const id of unreadIds) {
      await db.update(directMessages).set({ readAt: new Date() }).where(eq(directMessages.id, id));
    }
  }

  return msgs.reverse(); // oldest first
}

// Send a direct message
export async function sendDirectMessage(recipientId: string, content: string) {
  const session = await requireStaff();
  if (!content.trim()) return { error: "Mensaje vacío." };

  const [msg] = await db.insert(directMessages).values({
    senderId: session.user.id,
    recipientId,
    content: content.trim(),
  }).returning({ id: directMessages.id });

  // Send in-app notification
  createInAppNotification(recipientId, {
    type: "new_message",
    title: `Mensaje de ${session.user.name}`,
    body: content.trim().slice(0, 100),
    link: "/chat",
    entityType: "direct_message",
    entityId: msg.id,
  }).catch(() => {});

  return { success: true };
}

// Search staff members for starting a conversation
export async function searchStaffForChat(query: string) {
  await requireStaff();
  if (!query || query.length < 2) return [];

  const q = `%${query}%`;
  return db.query.users.findMany({
    where: and(
      eq(users.active, true),
      like(users.name, q)
    ),
    columns: { id: true, name: true, role: true, specialty: true, image: true },
    limit: 10,
  });
}
