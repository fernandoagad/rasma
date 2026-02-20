import { google } from "googleapis";
import { db } from "@/lib/db";
import { googleTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
    throw new Error("No se encontraron credenciales de Google para este usuario.");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiresAt?.getTime(),
  });

  // Handle token refresh
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

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startDateTime: Date;
  durationMinutes: number;
  attendeeEmails?: string[];
  addMeetLink: boolean;
  location?: string;
  reminders?: { method: "email" | "popup"; minutes: number }[];
}

export interface CalendarEventResult {
  eventId: string;
  meetLink: string | null;
  htmlLink: string;
}

/**
 * Create a Google Calendar event with optional Google Meet link.
 */
export async function createCalendarEvent(
  userId: string,
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const startTime = input.startDateTime;
  const endTime = new Date(
    startTime.getTime() + input.durationMinutes * 60 * 1000
  );

  const event: {
    summary?: string;
    description?: string;
    start?: { dateTime: string; timeZone: string };
    end?: { dateTime: string; timeZone: string };
    location?: string;
    attendees?: { email: string }[];
    conferenceData?: { createRequest: { requestId: string; conferenceSolutionKey: { type: string } } };
    reminders?: { useDefault: boolean; overrides: { method: string; minutes: number }[] };
  } = {
    summary: input.summary,
    description: input.description,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "America/Santiago", // Chilean timezone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "America/Santiago",
    },
    reminders: {
      useDefault: false,
      overrides: input.reminders || [
        { method: "email", minutes: 60 },
        { method: "popup", minutes: 15 },
      ],
    },
  };

  if (input.location) {
    event.location = input.location;
  }

  if (input.attendeeEmails && input.attendeeEmails.length > 0) {
    event.attendees = input.attendeeEmails.map((email) => ({ email }));
  }

  if (input.addMeetLink) {
    event.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
    conferenceDataVersion: input.addMeetLink ? 1 : 0,
    sendUpdates: input.attendeeEmails?.length ? "all" : "none",
  });

  return {
    eventId: response.data.id || "",
    meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri || null,
    htmlLink: response.data.htmlLink || "",
  };
}

/**
 * Update an existing Google Calendar event.
 */
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  input: Partial<CalendarEventInput>
): Promise<CalendarEventResult> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const updates: {
    summary?: string;
    description?: string;
    start?: { dateTime: string; timeZone: string };
    end?: { dateTime: string; timeZone: string };
    location?: string;
  } = {};

  if (input.summary) updates.summary = input.summary;
  if (input.description !== undefined) updates.description = input.description;

  if (input.startDateTime && input.durationMinutes) {
    const endTime = new Date(
      input.startDateTime.getTime() + input.durationMinutes * 60 * 1000
    );
    updates.start = {
      dateTime: input.startDateTime.toISOString(),
      timeZone: "America/Santiago",
    };
    updates.end = {
      dateTime: endTime.toISOString(),
      timeZone: "America/Santiago",
    };
  }

  if (input.location !== undefined) {
    updates.location = input.location || undefined;
  }

  const response = await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: updates,
  });

  return {
    eventId: response.data.id || "",
    meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri || null,
    htmlLink: response.data.htmlLink || "",
  };
}

/**
 * Delete a Google Calendar event.
 */
export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  });
}

/**
 * Check if a user has valid Google tokens for Calendar access.
 */
export async function hasGoogleCalendarAccess(
  userId: string
): Promise<boolean> {
  const tokens = await db.query.googleTokens.findFirst({
    where: eq(googleTokens.userId, userId),
  });

  return !!tokens?.refreshToken;
}
