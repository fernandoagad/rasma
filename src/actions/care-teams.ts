"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  careTeamMembers,
  careTeamMessages,
  careTeamMessageReads,
  patients,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, sql, lt, inArray } from "drizzle-orm";
import { appointments } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { createInAppNotification } from "@/actions/in-app-notifications";

// Get care team members for a patient
export async function getCareTeamForPatient(patientId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  return db.query.careTeamMembers.findMany({
    where: eq(careTeamMembers.patientId, patientId),
    with: {
      user: {
        columns: { id: true, name: true, email: true, role: true, specialty: true, image: true },
      },
    },
    orderBy: [careTeamMembers.addedAt],
  });
}

// Get care team members with their activity (sessions, last appointment)
export async function getCareTeamWithActivity(patientId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  const members = await db.query.careTeamMembers.findMany({
    where: eq(careTeamMembers.patientId, patientId),
    with: {
      user: {
        columns: { id: true, name: true, email: true, role: true, specialty: true, image: true },
      },
    },
    orderBy: [careTeamMembers.addedAt],
  });

  const memberIds = members.map((m) => m.userId);
  if (memberIds.length === 0) return [];

  const activityRows = await db
    .select({
      therapistId: appointments.therapistId,
      lastDate: sql<string>`max(${appointments.dateTime})`,
      totalSessions: sql<number>`count(*)`,
    })
    .from(appointments)
    .where(and(
      eq(appointments.patientId, patientId),
      inArray(appointments.therapistId, memberIds)
    ))
    .groupBy(appointments.therapistId);

  const activityMap = Object.fromEntries(
    activityRows.map((r) => [r.therapistId, { lastDate: r.lastDate, totalSessions: r.totalSessions }])
  );

  return members.map((m) => ({
    ...m,
    activity: activityMap[m.userId] ?? null,
  }));
}

// Add a member to a patient's care team
export async function addCareTeamMember(
  patientId: string,
  userId: string,
  role: string = "member"
) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado." };

  // Check if already a member
  const existing = await db.query.careTeamMembers.findFirst({
    where: and(
      eq(careTeamMembers.patientId, patientId),
      eq(careTeamMembers.userId, userId)
    ),
  });
  if (existing) return { error: "Este profesional ya es parte del equipo." };

  await db.insert(careTeamMembers).values({ patientId, userId, role });

  await logAudit({
    userId: session.user.id,
    action: "add_care_team_member",
    entityType: "care_team",
    entityId: patientId,
    details: { addedUserId: userId, role },
  });

  revalidatePath(`/pacientes/${patientId}`);
  return { success: true };
}

// Remove a member from a patient's care team
export async function removeCareTeamMember(patientId: string, userId: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado." };

  await db
    .delete(careTeamMembers)
    .where(
      and(
        eq(careTeamMembers.patientId, patientId),
        eq(careTeamMembers.userId, userId)
      )
    );

  await logAudit({
    userId: session.user.id,
    action: "remove_care_team_member",
    entityType: "care_team",
    entityId: patientId,
    details: { removedUserId: userId },
  });

  revalidatePath(`/pacientes/${patientId}`);
  return { success: true };
}

// Get messages for a patient's care team chat
export async function getCareTeamMessages(
  patientId: string,
  limit = 50,
  beforeId?: string
) {
  const session = await auth();
  if (!session?.user) return [];

  const conditions = [eq(careTeamMessages.patientId, patientId)];
  if (beforeId) {
    const beforeMsg = await db.query.careTeamMessages.findFirst({
      where: eq(careTeamMessages.id, beforeId),
      columns: { createdAt: true },
    });
    if (beforeMsg) {
      conditions.push(lt(careTeamMessages.createdAt, beforeMsg.createdAt));
    }
  }

  return db.query.careTeamMessages.findMany({
    where: and(...conditions),
    with: {
      sender: {
        columns: { id: true, name: true, image: true },
      },
    },
    orderBy: [desc(careTeamMessages.createdAt)],
    limit,
  });
}

// Send a message to a patient's care team
export async function sendCareTeamMessage(patientId: string, content: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado." };
  if (!content.trim()) return { error: "Mensaje vacío." };

  const [message] = await db
    .insert(careTeamMessages)
    .values({
      patientId,
      senderId: session.user.id,
      content: content.trim(),
    })
    .returning({ id: careTeamMessages.id });

  // Notify all team members except sender
  const teamMembers = await db.query.careTeamMembers.findMany({
    where: eq(careTeamMembers.patientId, patientId),
    columns: { userId: true },
  });

  const patient = await db.query.patients.findFirst({
    where: eq(patients.id, patientId),
    columns: { firstName: true, lastName: true },
  });
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Paciente";

  for (const member of teamMembers) {
    if (member.userId !== session.user.id) {
      createInAppNotification(member.userId, {
        type: "new_message",
        title: `Nuevo mensaje - ${patientName}`,
        body: `${session.user.name}: ${content.trim().slice(0, 100)}`,
        link: `/pacientes/${patientId}`,
        entityType: "message",
        entityId: message.id,
      }).catch(() => {});
    }
  }

  return { success: true, messageId: message.id };
}

// Get all teams the current user belongs to (for chat list)
export async function getMyTeams() {
  const session = await auth();
  if (!session?.user) return [];

  const memberships = await db.query.careTeamMembers.findMany({
    where: eq(careTeamMembers.userId, session.user.id),
    with: {
      patient: {
        columns: { id: true, firstName: true, lastName: true, status: true },
      },
    },
  });

  // Get unread counts per patient
  const teams = await Promise.all(
    memberships.map(async (m) => {
      const lastMsg = await db.query.careTeamMessages.findFirst({
        where: eq(careTeamMessages.patientId, m.patientId),
        orderBy: [desc(careTeamMessages.createdAt)],
        with: { sender: { columns: { name: true } } },
      });

      return {
        patientId: m.patientId,
        patient: m.patient,
        role: m.role,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              senderName: lastMsg.sender.name,
              createdAt: lastMsg.createdAt,
            }
          : null,
      };
    })
  );

  return teams;
}
