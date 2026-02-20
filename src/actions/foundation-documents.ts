"use server";

import { requireRole } from "@/lib/authorization";
import { db } from "@/lib/db";
import { foundationDocuments, users, systemSettings } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { deleteFileFromDriveById, renameFileOnDrive } from "@/lib/google-drive";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const ALLOWED_ROLES = ["admin", "supervisor", "rrhh"] as const;

// ---------------------------------------------------------------------------
// Foundation Info (stored as JSON in systemSettings)
// ---------------------------------------------------------------------------

export interface BoardMember {
  role: string;
  name: string;
  rut: string;
}

export interface FoundationInfo {
  name: string;
  legalName: string;
  rut: string;
  address: string;
  legalRepresentative: string;
  incorporationDate: string;
  registrationNumber: string;
  email: string;
  phone: string;
  nature: string;
  status: string;
  boardMembers: BoardMember[];
}

const FOUNDATION_INFO_KEY = "foundation_info";

const DEFAULT_FOUNDATION_INFO: FoundationInfo = {
  name: "",
  legalName: "",
  rut: "",
  address: "",
  legalRepresentative: "",
  incorporationDate: "",
  registrationNumber: "",
  email: "",
  phone: "",
  nature: "",
  status: "",
  boardMembers: [],
};

export async function getFoundationInfo(): Promise<FoundationInfo> {
  await requireRole(ALLOWED_ROLES);

  const setting = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, FOUNDATION_INFO_KEY),
  });

  if (!setting) return DEFAULT_FOUNDATION_INFO;

  try {
    return { ...DEFAULT_FOUNDATION_INFO, ...JSON.parse(setting.value) };
  } catch {
    return DEFAULT_FOUNDATION_INFO;
  }
}

export async function updateFoundationInfo(data: Partial<FoundationInfo>): Promise<{ success: true } | { error: string }> {
  try {
    const session = await requireRole(["admin"] as const);

    // Merge with existing
    const current = await getFoundationInfoInternal();
    const updated = { ...current, ...data };

    await db
      .insert(systemSettings)
      .values({
        key: FOUNDATION_INFO_KEY,
        value: JSON.stringify(updated),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: JSON.stringify(updated), updatedAt: new Date() },
      });

    await logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "foundation_info",
      details: data,
    });

    revalidatePath("/documentos");
    return { success: true };
  } catch {
    return { error: "Error al actualizar la información." };
  }
}

// Internal version that doesn't require auth (for use within other server actions)
async function getFoundationInfoInternal(): Promise<FoundationInfo> {
  const setting = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, FOUNDATION_INFO_KEY),
  });
  if (!setting) return DEFAULT_FOUNDATION_INFO;
  try {
    return { ...DEFAULT_FOUNDATION_INFO, ...JSON.parse(setting.value) };
  } catch {
    return DEFAULT_FOUNDATION_INFO;
  }
}

/** Returns the foundation name for Drive folder naming */
export async function getFoundationName(): Promise<string> {
  const info = await getFoundationInfoInternal();
  return info.name || "Fundación RASMA";
}

const VALID_CATEGORIES = [
  "manual",
  "legal",
  "politica",
  "reglamento",
  "certificado",
  "acta",
  "convenio",
  "financiero",
  "otro",
];

export async function getFoundationDocuments() {
  await requireRole(ALLOWED_ROLES);

  return db
    .select({
      id: foundationDocuments.id,
      driveFileId: foundationDocuments.driveFileId,
      fileName: foundationDocuments.fileName,
      mimeType: foundationDocuments.mimeType,
      fileSize: foundationDocuments.fileSize,
      category: foundationDocuments.category,
      label: foundationDocuments.label,
      driveViewLink: foundationDocuments.driveViewLink,
      driveDownloadLink: foundationDocuments.driveDownloadLink,
      uploadedBy: users.name,
      createdAt: foundationDocuments.createdAt,
    })
    .from(foundationDocuments)
    .innerJoin(users, eq(foundationDocuments.uploadedBy, users.id))
    .orderBy(desc(foundationDocuments.createdAt));
}

export async function deleteFoundationDocument(fileId: string) {
  const session = await requireRole(ALLOWED_ROLES);

  const file = await db.query.foundationDocuments.findFirst({
    where: eq(foundationDocuments.id, fileId),
  });
  if (!file) return { error: "Archivo no encontrado." };

  try {
    await deleteFileFromDriveById(file.driveFileId);
    await db.delete(foundationDocuments).where(eq(foundationDocuments.id, fileId));

    await logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "foundation_document",
      entityId: fileId,
      details: { fileName: file.fileName },
    });

    revalidatePath("/documentos");
    return { success: true };
  } catch {
    return { error: "Error al eliminar archivo." };
  }
}

export async function renameFoundationDocument(fileId: string, newFileName: string) {
  const session = await requireRole(ALLOWED_ROLES);

  const trimmed = newFileName.trim();
  if (!trimmed || trimmed.length > 255) return { error: "Nombre inválido." };

  const file = await db.query.foundationDocuments.findFirst({
    where: eq(foundationDocuments.id, fileId),
  });
  if (!file) return { error: "Archivo no encontrado." };

  try {
    await renameFileOnDrive(file.driveFileId, trimmed);
  } catch { /* Drive rename is best-effort */ }

  await db
    .update(foundationDocuments)
    .set({ fileName: trimmed, updatedAt: new Date() })
    .where(eq(foundationDocuments.id, fileId));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "foundation_document",
    entityId: fileId,
    details: { newName: trimmed },
  });

  revalidatePath("/documentos");
  return { success: true };
}

export async function updateFoundationDocLabel(fileId: string, label: string | null) {
  const session = await requireRole(ALLOWED_ROLES);

  const trimmed = label?.trim() || null;
  if (trimmed && trimmed.length > 100) return { error: "Etiqueta muy larga (máx 100 caracteres)." };

  await db
    .update(foundationDocuments)
    .set({ label: trimmed, updatedAt: new Date() })
    .where(eq(foundationDocuments.id, fileId));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "foundation_document",
    entityId: fileId,
    details: { label: trimmed },
  });

  revalidatePath("/documentos");
  return { success: true };
}

export async function updateFoundationDocCategory(fileId: string, category: string) {
  const session = await requireRole(ALLOWED_ROLES);

  if (!VALID_CATEGORIES.includes(category)) return { error: "Categoría inválida." };

  await db
    .update(foundationDocuments)
    .set({
      category: category as "manual" | "legal" | "politica" | "reglamento" | "certificado" | "acta" | "convenio" | "financiero" | "otro",
      updatedAt: new Date(),
    })
    .where(eq(foundationDocuments.id, fileId));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "foundation_document",
    entityId: fileId,
    details: { category },
  });

  revalidatePath("/documentos");
  return { success: true };
}

export async function bulkUpdateFoundationDocLabel(fileIds: string[], label: string | null) {
  const session = await requireRole(ALLOWED_ROLES);
  if (fileIds.length === 0) return { error: "Sin archivos seleccionados." };

  const trimmed = label?.trim() || null;
  await db
    .update(foundationDocuments)
    .set({ label: trimmed, updatedAt: new Date() })
    .where(inArray(foundationDocuments.id, fileIds));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "foundation_document",
    details: { bulkLabel: trimmed, count: fileIds.length },
  });

  revalidatePath("/documentos");
  return { success: true };
}

export async function bulkUpdateFoundationDocCategory(fileIds: string[], category: string) {
  const session = await requireRole(ALLOWED_ROLES);
  if (fileIds.length === 0) return { error: "Sin archivos seleccionados." };

  if (!VALID_CATEGORIES.includes(category)) return { error: "Categoría inválida." };

  await db
    .update(foundationDocuments)
    .set({
      category: category as "manual" | "legal" | "politica" | "reglamento" | "certificado" | "acta" | "convenio" | "financiero" | "otro",
      updatedAt: new Date(),
    })
    .where(inArray(foundationDocuments.id, fileIds));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "foundation_document",
    details: { bulkCategory: category, count: fileIds.length },
  });

  revalidatePath("/documentos");
  return { success: true };
}
