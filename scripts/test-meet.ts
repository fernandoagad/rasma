import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/lib/db/index.js");
  const { users, googleTokens, patients, appointments } = await import("../src/lib/db/schema.js");
  const { eq } = await import("drizzle-orm");
  const { google } = await import("googleapis");
  const { sendAppointmentConfirmation } = await import("../src/lib/email.js");

  const TARGET_EMAIL = "fernandoagad@gmail.com";

  // 1. Find admin user (contacto@rasma.cl)
  const admin = await db.select().from(users).where(eq(users.email, "contacto@rasma.cl")).then((r: any[]) => r[0]);
  if (!admin) { console.log("Admin user not found"); process.exit(1); }
  console.log(`Admin: ${admin.name} (${admin.id})`);

  // 2. Check if tokens already exist for admin
  const existingTokens = await db.select().from(googleTokens).where(eq(googleTokens.userId, admin.id)).then((r: any[]) => r[0]);

  // Always update tokens with latest refresh token (may have new scopes)
  console.log("Updating Google tokens for admin user...");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  console.log("Got fresh access token");

  const fullScope = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file";

  if (existingTokens) {
    await db.update(googleTokens)
      .set({
        accessToken: credentials.access_token!,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        scope: fullScope,
      })
      .where(eq(googleTokens.userId, admin.id));
    console.log("Tokens updated for admin.");
  } else {
    await db.insert(googleTokens).values({
      userId: admin.id,
      accessToken: credentials.access_token!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      scope: fullScope,
      tokenType: "Bearer",
    });
    console.log("Tokens stored for admin.");
  }

  // 3. Find a patient
  const allPatients = await db.select({ id: patients.id, firstName: patients.firstName, lastName: patients.lastName, email: patients.email }).from(patients).limit(5);
  console.log("Patients:", allPatients.map((p: any) => `${p.firstName} ${p.lastName} (${p.email})`));

  if (allPatients.length === 0) { console.log("No patients"); process.exit(1); }
  const patient = allPatients[0];

  // 4. Create calendar event with Meet link
  console.log("\nCreating Google Calendar event with Meet link...");
  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() + 30);

  const { createCalendarEvent } = await import("../src/lib/google-calendar.js");

  try {
    const result = await createCalendarEvent(admin.id, {
      summary: `Sesión de prueba - ${patient.firstName} ${patient.lastName}`,
      description: "Cita de prueba para verificar Google Meet",
      startDateTime: startTime,
      durationMinutes: 50,
      addMeetLink: true,
      attendeeEmails: [TARGET_EMAIL],
    });

    console.log("\nSUCCESS!");
    console.log("Event ID:", result.eventId);
    console.log("Meet Link:", result.meetLink);
    console.log("Calendar Link:", result.htmlLink);

    // 5. Store appointment in DB
    const [appt] = await db.insert(appointments).values({
      patientId: patient.id,
      therapistId: admin.id,
      dateTime: startTime,
      durationMinutes: 50,
      status: "programada",
      sessionType: "individual",
      modality: "online",
      meetingLink: result.meetLink,
      googleEventId: result.eventId,
      notes: "Cita de prueba para verificar Meet",
    }).returning({ id: appointments.id });

    console.log("Appointment created:", appt.id);

    // 6. Send confirmation email
    const dateStr = startTime.toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const emailSent = await sendAppointmentConfirmation(TARGET_EMAIL, {
      patientName: `${patient.firstName} ${patient.lastName}`,
      therapistName: admin.name,
      dateTime: dateStr,
      duration: 50,
      sessionType: "individual",
      modality: "online",
      meetingLink: result.meetLink,
    });

    console.log("Email sent to", TARGET_EMAIL, ":", emailSent);
    console.log("\nDone! Check your inbox.");
  } catch (err) {
    console.error("FAILED:", err);
  }

  process.exit(0);
}

main();
