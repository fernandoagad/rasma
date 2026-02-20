"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicants, applicantFiles, applicantNotes, users } from "@/lib/db/schema";
import { eq, desc, like, or, sql } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { sendApplicantEmail as sendApplicantEmailFn } from "@/lib/email";

function isHRAuthorized(role: string): boolean {
  return role === "admin" || role === "rrhh";
}

export async function getApplicants(filters?: {
  status?: string;
  search?: string;
  position?: string;
}) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) return [];

  let query = db
    .select({
      id: applicants.id,
      name: applicants.name,
      email: applicants.email,
      phone: applicants.phone,
      positions: applicants.positions,
      status: applicants.status,
      createdAt: applicants.createdAt,
    })
    .from(applicants)
    .$dynamic();

  const conditions = [];

  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(applicants.status, filters.status as "nuevo" | "en_revision" | "entrevista" | "aceptado" | "rechazado" | "en_espera"));
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        like(applicants.name, term),
        like(applicants.email, term),
        like(applicants.phone, term)
      )!
    );
  }

  if (filters?.position) {
    conditions.push(like(applicants.positions, `%${filters.position}%`));
  }

  if (conditions.length > 0) {
    const { and } = await import("drizzle-orm");
    query = query.where(and(...conditions));
  }

  return query.orderBy(desc(applicants.createdAt));
}

export async function getApplicantById(id: string) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) return null;

  const applicant = await db.query.applicants.findFirst({
    where: eq(applicants.id, id),
  });
  if (!applicant) return null;

  const files = await db
    .select()
    .from(applicantFiles)
    .where(eq(applicantFiles.applicantId, id))
    .orderBy(desc(applicantFiles.uploadedAt));

  const notes = await db
    .select({
      id: applicantNotes.id,
      content: applicantNotes.content,
      type: applicantNotes.type,
      createdAt: applicantNotes.createdAt,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(applicantNotes)
    .innerJoin(users, eq(applicantNotes.authorId, users.id))
    .where(eq(applicantNotes.applicantId, id))
    .orderBy(desc(applicantNotes.createdAt));

  return { ...applicant, files, notes };
}

export async function updateApplicantStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) {
    return { error: "No autorizado." };
  }

  const valid = ["nuevo", "en_revision", "entrevista", "aceptado", "rechazado", "en_espera"];
  if (!valid.includes(status)) return { error: "Estado inválido." };

  const applicant = await db.query.applicants.findFirst({
    where: eq(applicants.id, id),
    columns: { status: true, name: true },
  });
  if (!applicant) return { error: "Postulante no encontrado." };

  const oldStatus = applicant.status;

  await db
    .update(applicants)
    .set({ status: status as typeof applicant.status, updatedAt: new Date() })
    .where(eq(applicants.id, id));

  // Auto-log status change as note
  const statusLabels: Record<string, string> = {
    nuevo: "Nuevo",
    en_revision: "En revisión",
    entrevista: "Entrevista",
    aceptado: "Aceptado",
    rechazado: "Rechazado",
    en_espera: "En espera",
  };
  await db.insert(applicantNotes).values({
    applicantId: id,
    authorId: session.user.id,
    content: `Estado cambiado de "${statusLabels[oldStatus] || oldStatus}" a "${statusLabels[status] || status}"`,
    type: "estado_cambiado",
  });

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "applicant",
    entityId: id,
    details: { oldStatus, newStatus: status },
  });

  revalidatePath(`/rrhh/postulantes/${id}`);
  revalidatePath("/rrhh/postulantes");
  return { success: true };
}

export async function addApplicantNote(id: string, content: string) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) {
    return { error: "No autorizado." };
  }

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 2000) return { error: "Contenido inválido." };

  await db.insert(applicantNotes).values({
    applicantId: id,
    authorId: session.user.id,
    content: trimmed,
    type: "nota",
  });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "applicant_note",
    entityId: id,
  });

  revalidatePath(`/rrhh/postulantes/${id}`);
  return { success: true };
}

export async function deleteApplicant(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Solo administradores pueden eliminar postulantes." };
  }

  await db.delete(applicants).where(eq(applicants.id, id));

  await logAudit({
    userId: session.user.id,
    action: "delete",
    entityType: "applicant",
    entityId: id,
  });

  revalidatePath("/rrhh/postulantes");
  return { success: true };
}

export async function sendApplicantEmailAction(
  id: string,
  subject: string,
  body: string,
) {
  const session = await auth();
  if (!session?.user || !isHRAuthorized(session.user.role)) {
    return { error: "No autorizado." };
  }

  const applicant = await db.query.applicants.findFirst({
    where: eq(applicants.id, id),
    columns: { email: true, name: true },
  });
  if (!applicant) return { error: "Postulante no encontrado." };

  const sent = await sendApplicantEmailFn(
    applicant.email,
    applicant.name,
    subject,
    body
  );

  if (!sent) return { error: "Error al enviar el correo." };

  // Log as note
  await db.insert(applicantNotes).values({
    applicantId: id,
    authorId: session.user.id,
    content: `Correo enviado — Asunto: ${subject}`,
    type: "email_enviado",
  });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "applicant_email",
    entityId: id,
    details: { subject },
  });

  revalidatePath(`/rrhh/postulantes/${id}`);
  return { success: true };
}
