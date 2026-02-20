"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessionNotes, appointments } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/encryption";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PAGE_SIZE = 20;

const noteSchema = z.object({
  appointmentId: z.string().min(1, "Seleccione una cita"),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

export async function getSessionNotes(params?: {
  therapistId?: string;
  page?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  if (session.user.role === "recepcionista") throw new Error("No autorizado.");

  const page = params?.page || 1;
  const offset = (page - 1) * PAGE_SIZE;
  const conditions = [];

  // Therapists can only see their own notes
  if (session.user.role === "terapeuta") {
    conditions.push(eq(sessionNotes.therapistId, session.user.id));
  } else if (params?.therapistId) {
    conditions.push(eq(sessionNotes.therapistId, params.therapistId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(sessionNotes).where(where),
    db.query.sessionNotes.findMany({
      where,
      with: {
        appointment: {
          with: {
            patient: { columns: { id: true, firstName: true, lastName: true } },
          },
        },
        therapist: { columns: { id: true, name: true } },
      },
      orderBy: [desc(sessionNotes.createdAt)],
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  return {
    notes: data,
    total: countResult[0].count,
    totalPages: Math.ceil(countResult[0].count / PAGE_SIZE),
    currentPage: page,
  };
}

export async function getSessionNoteById(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");
  if (session.user.role === "recepcionista") throw new Error("No autorizado.");

  const note = await db.query.sessionNotes.findFirst({
    where: eq(sessionNotes.id, id),
    with: {
      appointment: {
        with: { patient: true },
      },
      therapist: { columns: { id: true, name: true } },
    },
  });

  if (!note) throw new Error("Nota no encontrada.");

  if (session.user.role === "terapeuta" && note.therapistId !== session.user.id) {
    throw new Error("No autorizado.");
  }

  // Decrypt content
  const decrypted = decrypt(note.encryptedContent, note.contentIv, note.contentTag);
  const content = JSON.parse(decrypted);

  return { ...note, content };
}

export async function createSessionNote(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado." };
  if (!["admin", "terapeuta"].includes(session.user.role)) return { error: "No autorizado." };

  const parsed = noteSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    subjective: formData.get("subjective"),
    objective: formData.get("objective"),
    assessment: formData.get("assessment"),
    plan: formData.get("plan"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const content = JSON.stringify({
    subjective: parsed.data.subjective || "",
    objective: parsed.data.objective || "",
    assessment: parsed.data.assessment || "",
    plan: parsed.data.plan || "",
  });

  const { encrypted, iv, tag } = encrypt(content);

  const [note] = await db.insert(sessionNotes).values({
    appointmentId: parsed.data.appointmentId,
    therapistId: session.user.id,
    encryptedContent: encrypted,
    contentIv: iv,
    contentTag: tag,
  }).returning({ id: sessionNotes.id });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "session_note",
    entityId: note.id,
  });

  revalidatePath("/notas");
  return { success: true };
}

export async function updateSessionNote(
  id: string,
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado." };

  const existing = await db.query.sessionNotes.findFirst({
    where: eq(sessionNotes.id, id),
  });

  if (!existing) return { error: "Nota no encontrada." };
  if (session.user.role === "terapeuta" && existing.therapistId !== session.user.id) {
    return { error: "No autorizado." };
  }

  const content = JSON.stringify({
    subjective: formData.get("subjective") || "",
    objective: formData.get("objective") || "",
    assessment: formData.get("assessment") || "",
    plan: formData.get("plan") || "",
  });

  const { encrypted, iv, tag } = encrypt(content);

  await db.update(sessionNotes).set({
    encryptedContent: encrypted,
    contentIv: iv,
    contentTag: tag,
    updatedAt: new Date(),
  }).where(eq(sessionNotes.id, id));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "session_note",
    entityId: id,
  });

  revalidatePath("/notas");
  return { success: true };
}

export async function getCompletedAppointmentsWithoutNotes() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  const therapistFilter = session.user.role === "terapeuta"
    ? eq(appointments.therapistId, session.user.id)
    : undefined;

  const completed = await db.query.appointments.findMany({
    where: and(
      eq(appointments.status, "completada"),
      therapistFilter,
    ),
    with: {
      patient: { columns: { id: true, firstName: true, lastName: true } },
      sessionNote: { columns: { id: true } },
    },
    orderBy: [desc(appointments.dateTime)],
    limit: 50,
  });

  return completed.filter((a) => !a.sessionNote);
}
