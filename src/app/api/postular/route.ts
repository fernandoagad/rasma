import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applicants, applicantFiles } from "@/lib/db/schema";
import { applicantFormSchema } from "@/lib/validations/applicant";
import { uploadApplicantFile } from "@/lib/google-drive";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const positionsRaw = formData.get("positions") as string;
    const file = formData.get("file") as File | null;

    // Parse positions
    let positions: string[];
    try {
      positions = JSON.parse(positionsRaw);
    } catch {
      return NextResponse.json({ error: "Formato de puestos inválido." }, { status: 400 });
    }

    // Validate form data
    const result = applicantFormSchema.safeParse({ name, email, phone, positions });
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || "Datos inválidos.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // Validate file
    if (!file) {
      return NextResponse.json({ error: "Adjunte su currículum." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Solo se permiten archivos PDF, DOC o DOCX." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo no debe exceder 10 MB." }, { status: 400 });
    }

    // Insert applicant
    const [applicant] = await db
      .insert(applicants)
      .values({
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone,
        positions: JSON.stringify(result.data.positions),
      })
      .returning({ id: applicants.id });

    // Upload file to Google Drive
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const driveResult = await uploadApplicantFile(
        applicant.id,
        result.data.name,
        {
          buffer,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        }
      );

      await db.insert(applicantFiles).values({
        applicantId: applicant.id,
        driveFileId: driveResult.driveFileId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        driveViewLink: driveResult.viewLink,
        driveDownloadLink: driveResult.downloadLink,
      });
    } catch (err) {
      console.error("Error uploading applicant file to Drive:", err);
      // The application is still saved even if file upload fails
    }

    return NextResponse.json({ success: true, id: applicant.id });
  } catch (error) {
    console.error("Error submitting application:", error);
    return NextResponse.json({ error: "Error al procesar la postulación." }, { status: 500 });
  }
}
