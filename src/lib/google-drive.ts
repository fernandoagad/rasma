import { google } from "googleapis";
import { db } from "@/lib/db";
import { googleTokens, patientFolders, patientFiles, users, systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Readable } from "stream";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.AUTH_URL}/api/auth/callback/google`
  );
}

/**
 * Gets the Google OAuth client using the admin account (contacto@rasma.cl).
 * All Drive operations use a single shared account so files are centralized.
 * Falls back to GMAIL_REFRESH_TOKEN env var if no DB tokens found.
 */
async function getAuthenticatedClient() {
  // Try DB tokens first: admin user (contacto@rasma.cl)
  const adminUser = await db.query.users.findFirst({
    where: eq(users.email, "contacto@rasma.cl"),
    columns: { id: true },
  });

  const adminId = adminUser?.id;
  let tokens = adminId
    ? await db.query.googleTokens.findFirst({ where: eq(googleTokens.userId, adminId) })
    : null;

  // Fallback: use any available Google tokens from DB
  if (!tokens) {
    tokens = await db.query.googleTokens.findFirst();
  }

  const oauth2Client = getOAuth2Client();

  if (tokens) {
    const tokenUserId = tokens.userId;
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiresAt?.getTime(),
    });

    oauth2Client.on("tokens", async (newTokens) => {
      await db
        .update(googleTokens)
        .set({
          accessToken: newTokens.access_token || tokens!.accessToken,
          refreshToken: newTokens.refresh_token || tokens!.refreshToken,
          expiresAt: newTokens.expiry_date
            ? new Date(newTokens.expiry_date)
            : tokens!.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(googleTokens.userId, tokenUserId));
    });

    return oauth2Client;
  }

  // Final fallback: use GMAIL_REFRESH_TOKEN env var (same token used for emails)
  const envRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (envRefreshToken) {
    oauth2Client.setCredentials({
      refresh_token: envRefreshToken,
    });
    return oauth2Client;
  }

  throw new Error("No se encontraron credenciales de Google. Configure la cuenta de Google desde Configuracion.");
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

  const auth = await getAuthenticatedClient();
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

  const auth = await getAuthenticatedClient();
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
    fields: "id,webViewLink,webContentLink,thumbnailLink",
  });

  // Make file viewable by anyone with the link (needed for iframe preview)
  await drive.permissions.create({
    fileId: driveFile.data.id!,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
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

  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  try {
    await drive.files.delete({ fileId: file.driveFileId });
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error?.code !== 404) throw err;
  }

  await db.delete(patientFiles).where(eq(patientFiles.id, fileId));
}

/**
 * Delete a file from Google Drive by its Drive file ID (no DB cleanup).
 */
export async function deleteFileFromDriveById(driveFileId: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });
  try {
    await drive.files.delete({ fileId: driveFileId });
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error?.code !== 404) throw err;
  }
}

/**
 * Rename a file on Google Drive.
 */
export async function renameFileOnDrive(driveFileId: string, newName: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });
  await drive.files.update({
    fileId: driveFileId,
    requestBody: { name: newName },
  });
}

/**
 * Upload a staff member's document (CV, contract, etc.) to Google Drive.
 * Stored under "RASMA - Equipo/{staffName}" folder.
 */
export async function uploadStaffFile(
  staffName: string,
  file: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    size: number;
  }
) {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  // Get or create "RASMA - Equipo" root folder
  const rootFolderName = "RASMA - Equipo";
  const rootSearch = await drive.files.list({
    q: `name='${rootFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  let rootFolderId: string;
  if (rootSearch.data.files?.length) {
    rootFolderId = rootSearch.data.files[0].id!;
  } else {
    const rootFolder = await drive.files.create({
      requestBody: {
        name: rootFolderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    rootFolderId = rootFolder.data.id!;
  }

  // Get or create staff member subfolder
  const subSearch = await drive.files.list({
    q: `name='${staffName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  let subFolderId: string;
  if (subSearch.data.files?.length) {
    subFolderId = subSearch.data.files[0].id!;
  } else {
    const subFolder = await drive.files.create({
      requestBody: {
        name: staffName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [rootFolderId],
      },
      fields: "id",
    });
    subFolderId = subFolder.data.id!;
  }

  // Upload file
  const stream = Readable.from(file.buffer);
  const driveFile = await drive.files.create({
    requestBody: {
      name: file.fileName,
      parents: [subFolderId],
    },
    media: {
      mimeType: file.mimeType,
      body: stream,
    },
    fields: "id,webViewLink,webContentLink",
  });

  await drive.permissions.create({
    fileId: driveFile.data.id!,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    driveFileId: driveFile.data.id!,
    viewLink: driveFile.data.webViewLink || null,
    downloadLink: driveFile.data.webContentLink || null,
  };
}

/**
 * Upload an expense receipt to Google Drive.
 * Stored under "RASMA - Gastos" folder.
 */
export async function uploadExpenseReceipt(
  file: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    size: number;
  }
) {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  // Get or create "RASMA - Gastos" root folder
  const rootFolderName = "RASMA - Gastos";
  const rootSearch = await drive.files.list({
    q: `name='${rootFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  let rootFolderId: string;
  if (rootSearch.data.files?.length) {
    rootFolderId = rootSearch.data.files[0].id!;
  } else {
    const rootFolder = await drive.files.create({
      requestBody: {
        name: rootFolderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    rootFolderId = rootFolder.data.id!;
  }

  // Upload file
  const stream = Readable.from(file.buffer);
  const driveFile = await drive.files.create({
    requestBody: {
      name: file.fileName,
      parents: [rootFolderId],
    },
    media: {
      mimeType: file.mimeType,
      body: stream,
    },
    fields: "id,webViewLink,webContentLink",
  });

  await drive.permissions.create({
    fileId: driveFile.data.id!,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    driveFileId: driveFile.data.id!,
    viewLink: driveFile.data.webViewLink || null,
    downloadLink: driveFile.data.webContentLink || null,
  };
}

/**
 * Upload an applicant's file (CV/cover letter) to Google Drive.
 * Stored under "RASMA - Postulaciones/{applicantName}" folder.
 */
export async function uploadApplicantFile(
  applicantId: string,
  applicantName: string,
  file: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    size: number;
  }
) {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  // Get or create "RASMA - Postulaciones" root folder
  const rootFolderName = "RASMA - Postulaciones";
  const rootSearch = await drive.files.list({
    q: `name='${rootFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  let rootFolderId: string;
  if (rootSearch.data.files?.length) {
    rootFolderId = rootSearch.data.files[0].id!;
  } else {
    const rootFolder = await drive.files.create({
      requestBody: {
        name: rootFolderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    rootFolderId = rootFolder.data.id!;
  }

  // Create applicant subfolder
  const subFolderName = applicantName;
  const subFolder = await drive.files.create({
    requestBody: {
      name: subFolderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId],
    },
    fields: "id",
  });
  const subFolderId = subFolder.data.id!;

  // Upload file
  const stream = Readable.from(file.buffer);
  const driveFile = await drive.files.create({
    requestBody: {
      name: file.fileName,
      parents: [subFolderId],
    },
    media: {
      mimeType: file.mimeType,
      body: stream,
    },
    fields: "id,webViewLink,webContentLink",
  });

  // Make viewable by anyone with the link
  await drive.permissions.create({
    fileId: driveFile.data.id!,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    driveFileId: driveFile.data.id!,
    viewLink: driveFile.data.webViewLink || null,
    downloadLink: driveFile.data.webContentLink || null,
  };
}

/**
 * Get or create the foundation's root folder on Google Drive.
 * Uses the foundation name from settings, falls back to "RASMA - Fundación".
 * Persists the folder ID in systemSettings for fast lookups.
 */
async function getOrCreateFoundationFolder(): Promise<string> {
  const SETTINGS_KEY = "drive_foundation_folder_id";

  // Check systemSettings first for cached folder ID
  const setting = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, SETTINGS_KEY),
  });

  const authClient = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth: authClient });

  if (setting) {
    // Verify the folder still exists
    try {
      await drive.files.get({ fileId: setting.value, fields: "id,trashed" });
      return setting.value;
    } catch {
      // Folder deleted or inaccessible — recreate
    }
  }

  // Get foundation name from settings for the folder name
  const infoSetting = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, "foundation_info"),
  });
  let foundationName = "Fundación RASMA";
  if (infoSetting) {
    try {
      const info = JSON.parse(infoSetting.value);
      if (info.name) foundationName = info.name;
    } catch { /* use default */ }
  }

  const folderName = `RASMA - ${foundationName}`;

  // Search for existing folder by name
  const search = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  let folderId: string;
  if (search.data.files?.length) {
    folderId = search.data.files[0].id!;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    folderId = folder.data.id!;
  }

  // Persist in systemSettings
  await db
    .insert(systemSettings)
    .values({ key: SETTINGS_KEY, value: folderId })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: folderId, updatedAt: new Date() },
    });

  return folderId;
}

/**
 * Upload a foundation document to Google Drive.
 * Stored under "RASMA - Fundación" folder.
 */
export async function uploadFoundationDocument(
  file: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    size: number;
  }
) {
  const parentFolderId = await getOrCreateFoundationFolder();

  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  const stream = Readable.from(file.buffer);
  const driveFile = await drive.files.create({
    requestBody: {
      name: file.fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType: file.mimeType,
      body: stream,
    },
    fields: "id,webViewLink,webContentLink",
  });

  await drive.permissions.create({
    fileId: driveFile.data.id!,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    driveFileId: driveFile.data.id!,
    viewLink: driveFile.data.webViewLink || null,
    downloadLink: driveFile.data.webContentLink || null,
  };
}
