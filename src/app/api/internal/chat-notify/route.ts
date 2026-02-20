import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { careTeamMessages, careTeamMembers, patients, users, userPresence } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { sendChatMessageNotification } from "@/lib/email";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET || "internal";

/**
 * POST /api/internal/chat-notify
 * Called after a delay when chat messages are sent.
 * Counts how many messages the sender sent in the batch window and sends
 * a single email to each offline team member.
 *
 * Body: { senderId, patientId, windowStart (ISO string) }
 */
export async function POST(request: NextRequest) {
  // Simple auth check for internal calls
  const authHeader = request.headers.get("x-internal-secret");
  if (authHeader !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { senderId, patientId, windowStart } = await request.json();
  if (!senderId || !patientId || !windowStart) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const windowDate = new Date(windowStart);

  // Count messages from this sender since windowStart
  const recentMessages = await db
    .select({ id: careTeamMessages.id })
    .from(careTeamMessages)
    .where(
      and(
        eq(careTeamMessages.patientId, patientId),
        eq(careTeamMessages.senderId, senderId),
        gte(careTeamMessages.createdAt, windowDate)
      )
    );

  const messageCount = recentMessages.length;
  if (messageCount === 0) {
    return NextResponse.json({ sent: false, reason: "no_messages" });
  }

  // Get sender name
  const sender = await db.query.users.findFirst({
    where: eq(users.id, senderId),
    columns: { name: true },
  });

  // Get patient name
  const patient = await db.query.patients.findFirst({
    where: eq(patients.id, patientId),
    columns: { firstName: true, lastName: true },
  });
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Paciente";

  // Get team members except sender
  const teamMembers = await db.query.careTeamMembers.findMany({
    where: eq(careTeamMembers.patientId, patientId),
    with: {
      user: { columns: { id: true, email: true, name: true } },
    },
  });

  // Get online users (active in last 2 minutes) — skip email for them
  const threshold = new Date(Date.now() - 2 * 60 * 1000);
  const onlinePresence = await db.query.userPresence.findMany({
    where: gte(userPresence.lastSeen, threshold),
    columns: { userId: true },
  });
  const onlineIds = new Set(onlinePresence.map((p) => p.userId));

  let emailsSent = 0;
  for (const member of teamMembers) {
    if (member.userId === senderId) continue;
    // Skip users who are currently online (they'll see in-app notifications)
    if (onlineIds.has(member.userId)) continue;
    if (!member.user.email) continue;

    await sendChatMessageNotification(
      member.user.email,
      sender?.name || "Un profesional",
      patientName,
      messageCount,
      patientId
    );
    emailsSent++;
  }

  return NextResponse.json({ sent: true, emailsSent, messageCount });
}
