import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, staffDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { uploadStaffFile } from "@/lib/google-drive";
import { logAudit } from "@/lib/audit";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["admin", "rrhh"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id: staffUserId } = await params;

  const staffUser = await db.query.users.findFirst({
    where: eq(users.id, staffUserId),
    columns: { name: true },
  });
  if (!staffUser) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "otro";

  if (!file) {
    return NextResponse.json({ error: "No se proporcionó archivo." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "El archivo excede 25MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadStaffFile(staffUser.name, {
      buffer,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });

    const [doc] = await db
      .insert(staffDocuments)
      .values({
        userId: staffUserId,
        driveFileId: result.driveFileId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        category: category as "cv" | "contrato" | "certificacion" | "evaluacion" | "otro",
        driveViewLink: result.viewLink,
        driveDownloadLink: result.downloadLink,
        uploadedBy: session.user.id,
      })
      .returning({ id: staffDocuments.id });

    await logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "staff_document",
      entityId: doc.id,
      details: { staffUserId, fileName: file.name, category },
    });

    return NextResponse.json({ success: true, file: { id: doc.id, ...result } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al subir archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
