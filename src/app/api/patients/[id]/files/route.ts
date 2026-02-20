import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, careTeamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadFileToDrive } from "@/lib/google-drive";
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

async function checkAccess(
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id: patientId } = await params;

  const hasAccess = await checkAccess(
    session.user.id,
    session.user.role,
    patientId
  );
  if (!hasAccess) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const patient = await db.query.patients.findFirst({
    where: eq(patients.id, patientId),
    columns: { firstName: true, lastName: true },
  });
  if (!patient) {
    return NextResponse.json(
      { error: "Paciente no encontrado." },
      { status: 404 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const patientName = `${patient.firstName} ${patient.lastName}`;

    const result = await uploadFileToDrive(
      session.user.id,
      patientId,
      patientName,
      {
        buffer,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      }
    );

    await logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "patient_file",
      entityId: result.id,
      details: { patientId, fileName: file.name, fileSize: file.size },
    });

    return NextResponse.json({ success: true, file: result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al subir archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
