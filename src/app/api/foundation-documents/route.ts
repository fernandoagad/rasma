import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foundationDocuments } from "@/lib/db/schema";
import { uploadFoundationDocument } from "@/lib/google-drive";
import { logAudit } from "@/lib/audit";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
];

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

const ALLOWED_ROLES = ["admin", "supervisor", "rrhh"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "otro";

  if (!file) {
    return NextResponse.json(
      { error: "No se proporcionó archivo." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El archivo excede el tamaño máximo (25MB)." },
      { status: 400 }
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: "Categoría inválida." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadFoundationDocument({
      buffer,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });

    const [doc] = await db
      .insert(foundationDocuments)
      .values({
        driveFileId: result.driveFileId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        driveViewLink: result.viewLink,
        driveDownloadLink: result.downloadLink,
        category: category as "manual" | "legal" | "politica" | "reglamento" | "certificado" | "acta" | "convenio" | "financiero" | "otro",
        uploadedBy: session.user.id,
      })
      .returning({ id: foundationDocuments.id });

    await logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "foundation_document",
      entityId: doc.id,
      details: { fileName: file.name, fileSize: file.size, category },
    });

    return NextResponse.json({
      success: true,
      file: { id: doc.id, ...result },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al subir archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
