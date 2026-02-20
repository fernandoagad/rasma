"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { patientFiles, patients, careTeamMembers, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { deleteFileFromDrive } from "@/lib/google-drive";
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
  const session = await auth();
  if (!session?.user) return [];

  const hasAccess = await canAccessPatientFiles(
    session.user.id,
    session.user.role,
    patientId
  );
  if (!hasAccess) return [];

  return db
    .select({
      id: patientFiles.id,
      fileName: patientFiles.fileName,
      mimeType: patientFiles.mimeType,
      fileSize: patientFiles.fileSize,
      category: patientFiles.category,
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
  const session = await auth();
  if (!session?.user) return { error: "No autorizado." };

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
