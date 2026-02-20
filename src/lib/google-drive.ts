import { google } from "googleapis";
import { db } from "@/lib/db";
import { googleTokens, patientFolders, patientFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Readable } from "stream";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.AUTH_URL}/api/auth/callback/google`
  );
}

async function getAuthenticatedClient(userId: string) {
  const tokens = await db.query.googleTokens.findFirst({
    where: eq(googleTokens.userId, userId),
  });

  if (!tokens) {
    throw new Error("No se encontraron credenciales de Google. Inicie sesión con Google para habilitar archivos.");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiresAt?.getTime(),
  });

  oauth2Client.on("tokens", async (newTokens) => {
    await db
      .update(googleTokens)
      .set({
        accessToken: newTokens.access_token || tokens.accessToken,
        refreshToken: newTokens.refresh_token || tokens.refreshToken,
        expiresAt: newTokens.expiry_date
          ? new Date(newTokens.expiry_date)
          : tokens.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(googleTokens.userId, userId));
  });

  return oauth2Client;
}

/**
 * Get or create a Google Drive folder for a patient.
 */
export async function getOrCreatePatientFolder(
  userId: string,
  patientId: string,
  patientName: string
): Promise<{ folderId: string; driveFolderId: string }> {
  const existing = await db.query.patientFolders.findFirst({
    where: eq(patientFolders.patientId, patientId),
  });
  if (existing) {
    return { folderId: existing.id, driveFolderId: existing.driveFolderId };
  }

  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: "v3", auth });

  const folderName = `RASMA - ${patientName}`;
  const folderMeta = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  const driveFolderId = folderMeta.data.id!;

  const [folder] = await db
    .insert(patientFolders)
    .values({
      patientId,
      driveFolderId,
      folderName,
      createdBy: userId,
    })
    .returning({ id: patientFolders.id });

  return { folderId: folder.id, driveFolderId };
}

/**
 * Upload a file to a patient's Google Drive folder.
 */
export async function uploadFileToDrive(
  userId: string,
  patientId: string,
  patientName: string,
  file: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    size: number;
  }
) {
  const { folderId, driveFolderId } = await getOrCreatePatientFolder(
    userId,
    patientId,
    patientName
  );

  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: "v3", auth });

  const stream = Readable.from(file.buffer);

  const driveFile = await drive.files.create({
    requestBody: {
      name: file.fileName,
      parents: [driveFolderId],
    },
    media: {
      mimeType: file.mimeType,
      body: stream,
    },
    fields: "id,webViewLink,webContentLink",
  });

  const [dbFile] = await db
    .insert(patientFiles)
    .values({
      patientId,
      folderId,
      driveFileId: driveFile.data.id!,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.size,
      driveViewLink: driveFile.data.webViewLink || null,
      driveDownloadLink: driveFile.data.webContentLink || null,
      uploadedBy: userId,
    })
    .returning({ id: patientFiles.id });

  return {
    id: dbFile.id,
    driveFileId: driveFile.data.id!,
    viewLink: driveFile.data.webViewLink || null,
    downloadLink: driveFile.data.webContentLink || null,
  };
}

/**
 * Delete a file from Google Drive and the database.
 */
export async function deleteFileFromDrive(
  userId: string,
  fileId: string
): Promise<void> {
  const file = await db.query.patientFiles.findFirst({
    where: eq(patientFiles.id, fileId),
  });
  if (!file) throw new Error("Archivo no encontrado.");

  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: "v3", auth });

  try {
    await drive.files.delete({ fileId: file.driveFileId });
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error?.code !== 404) throw err;
  }

  await db.delete(patientFiles).where(eq(patientFiles.id, fileId));
}
