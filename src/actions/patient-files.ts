"use server";

import { requireStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import { patientFiles, patients, careTeamMembers, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { deleteFileFromDrive, renameFileOnDrive } from "@/lib/google-drive";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function canAccessPatientFiles(
  userId: string,
  userRole: string,
  patientId: string
): Promise<boolean> {
  if (userRole === "admin") return true;

  const patient = await db.query.patients.findFirst({
    where: eq(patients.id, patientId),
    columns: { primaryTherapistId: true },
  });
  if (patient?.primaryTherapistId === userId) return true;

  const member = await db.query.careTeamMembers.findFirst({
    where: and(
      eq(careTeamMembers.patientId, patientId),
      eq(careTeamMembers.userId, userId)
    ),
  });
  return !!member;
}

export async function getPatientFiles(patientId: string) {
  const session = await requireStaff();

  const hasAccess = await canAccessPatientFiles(
    session.user.id,
    session.user.role,
    patientId
  );
  if (!hasAccess) return [];

  return db
    .select({
      id: patientFiles.id,
      driveFileId: patientFiles.driveFileId,
      fileName: patientFiles.fileName,
      mimeType: patientFiles.mimeType,
      fileSize: patientFiles.fileSize,
      category: patientFiles.category,
      label: patientFiles.label,
      driveViewLink: patientFiles.driveViewLink,
      driveDownloadLink: patientFiles.driveDownloadLink,
      uploadedBy: users.name,
      createdAt: patientFiles.createdAt,
    })
    .from(patientFiles)
    .innerJoin(users, eq(patientFiles.uploadedBy, users.id))
    .where(eq(patientFiles.patientId, patientId))
    .orderBy(desc(patientFiles.createdAt));
}

export async function deletePatientFile(fileId: string, patientId: string) {
  const session = await requireStaff();

  const hasAccess = await canAccessPatientFiles(
    session.user.id,
    session.user.role,
    patientId
  );
  if (!hasAccess) return { error: "Sin permiso para eliminar archivos." };

  try {
    await deleteFileFromDrive(session.user.id, fileId);

    await logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "patient_file",
      entityId: fileId,
      details: { patientId },
    });

    revalidatePath(`/pacientes/${patientId}`);
    return { success: true };
  } catch {
    return { error: "Error al eliminar archivo." };
  }
}

export async function renamePatientFile(fileId: string, patientId: string, newFileName: string) {
  const session = await requireStaff();
  const hasAccess = await canAccessPatientFiles(session.user.id, session.user.role, patientId);
  if (!hasAccess) return { error: "Sin permiso." };

  const trimmed = newFileName.trim();
  if (!trimmed || trimmed.length > 255) return { error: "Nombre inválido." };

  const file = await db.query.patientFiles.findFirst({ where: eq(patientFiles.id, fileId) });
  if (!file) return { error: "Archivo no encontrado." };

  try {
    await renameFileOnDrive(file.driveFileId, trimmed);
  } catch { /* Drive rename is best-effort */ }

  await db.update(patientFiles).set({ fileName: trimmed }).where(eq(patientFiles.id, fileId));
  await logAudit({ userId: session.user.id, action: "update", entityType: "patient_file", entityId: fileId, details: { patientId, newName: trimmed } });
  revalidatePath(`/pacientes/${patientId}`);
  return { success: true };
}

export async function updateFileLabel(fileId: string, patientId: string, label: string | null) {
  const session = await requireStaff();
  const hasAccess = await canAccessPatientFiles(session.user.id, session.user.role, patientId);
  if (!hasAccess) return { error: "Sin permiso." };

  const trimmed = label?.trim() || null;
  if (trimmed && trimmed.length > 100) return { error: "Etiqueta muy larga (máx 100 caracteres)." };

  await db.update(patientFiles).set({ label: trimmed }).where(eq(patientFiles.id, fileId));
  await logAudit({ userId: session.user.id, action: "update", entityType: "patient_file", entityId: fileId, details: { patientId, label: trimmed } });
  revalidatePath(`/pacientes/${patientId}`);
  return { success: true };
}

export async function updateFileCategory(fileId: string, patientId: string, category: string) {
  const session = await requireStaff();
  const hasAccess = await canAccessPatientFiles(session.user.id, session.user.role, patientId);
  if (!hasAccess) return { error: "Sin permiso." };

  const valid = ["general", "evaluacion", "informe", "consentimiento", "otro"];
  if (!valid.includes(category)) return { error: "Categoría inválida." };

  await db.update(patientFiles).set({ category: category as "general" | "evaluacion" | "informe" | "consentimiento" | "otro" }).where(eq(patientFiles.id, fileId));
  await logAudit({ userId: session.user.id, action: "update", entityType: "patient_file", entityId: fileId, details: { patientId, category } });
  revalidatePath(`/pacientes/${patientId}`);
  return { success: true };
}

export async function bulkUpdatePatientFileLabel(fileIds: string[], patientId: string, label: string | null) {
  const session = await requireStaff();
  const hasAccess = await canAccessPatientFiles(session.user.id, session.user.role, patientId);
  if (!hasAccess) return { error: "Sin permiso." };
  if (fileIds.length === 0) return { error: "Sin archivos seleccionados." };

  const trimmed = label?.trim() || null;
  await db.update(patientFiles).set({ label: trimmed }).where(inArray(patientFiles.id, fileIds));
  await logAudit({ userId: session.user.id, action: "update", entityType: "patient_file", details: { patientId, bulkLabel: trimmed, count: fileIds.length } });
  revalidatePath(`/pacientes/${patientId}`);
  return { success: true };
}

export async function bulkUpdatePatientFileCategory(fileIds: string[], patientId: string, category: string) {
  const session = await requireStaff();
  const hasAccess = await canAccessPatientFiles(session.user.id, session.user.role, patientId);
  if (!hasAccess) return { error: "Sin permiso." };
  if (fileIds.length === 0) return { error: "Sin archivos seleccionados." };

  const valid = ["general", "evaluacion", "informe", "consentimiento", "otro"];
  if (!valid.includes(category)) return { error: "Categoría inválida." };

  await db.update(patientFiles).set({ category: category as "general" | "evaluacion" | "informe" | "consentimiento" | "otro" }).where(inArray(patientFiles.id, fileIds));
  await logAudit({ userId: session.user.id, action: "update", entityType: "patient_file", details: { patientId, bulkCategory: category, count: fileIds.length } });
  revalidatePath(`/pacientes/${patientId}`);
  return { success: true };
}
