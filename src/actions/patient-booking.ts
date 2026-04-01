"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  appointments,
  careTeamMembers,
  patients,
  users,
  therapistAvailability,
  therapistExceptions,
} from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { parseChileDateTime, CHILE_TZ } from "@/lib/timezone";
import {
  notifyAppointmentCreated,
  createAppointmentReminder,
} from "@/lib/notifications";

/**
 * Get ALL specialties offered by the foundation.
 * Returns every unique specialty from active therapists, regardless of
 * whether they have availability configured yet.
 */
export async function getBookableSpecialties() {
  const session = await auth();
  if (!session?.user) return [];

  // Get all active therapists with a specialty set
  const allTherapists = await db.query.users.findMany({
    where: and(
      eq(users.role, "terapeuta"),
      eq(users.active, true),
    ),
    columns: { specialty: true },
  });

  const specialties = new Set<string>();
  for (const t of allTherapists) {
    if (t.specialty) specialties.add(t.specialty);
  }

  return Array.from(specialties).sort();
}

/**
 * Get therapists with available time slots for a specific specialty and date.
 * Returns therapists filtered by specialty with their available slots for that day.
 */
export async function getTherapistsWithSlotsForDate(
  specialty: string,
  dateStr: string
) {
  const session = await auth();
  if (!session?.user) return [];

  const patientId = session.user.linkedPatientId;

  let scopedTherapistIds: string[] | null = null;

  if (patientId) {
    const [team, patient] = await Promise.all([
      db.query.careTeamMembers.findMany({
        where: eq(careTeamMembers.patientId, patientId),
        columns: { userId: true },
      }),
      db.query.patients.findFirst({
        where: eq(patients.id, patientId),
        columns: { primaryTherapistId: true },
      }),
    ]);
    const ids = new Set(team.map((m) => m.userId));
    if (patient?.primaryTherapistId) ids.add(patient.primaryTherapistId);
    scopedTherapistIds = Array.from(ids);
    if (scopedTherapistIds.length === 0) return [];
  }

  // Get therapists matching the specialty
  const specialtyFilter = scopedTherapistIds
    ? and(
        eq(users.specialty, specialty),
        eq(users.role, "terapeuta"),
        eq(users.active, true),
        inArray(users.id, scopedTherapistIds)
      )
    : and(
        eq(users.specialty, specialty),
        eq(users.role, "terapeuta"),
        eq(users.active, true)
      );

  const matchingTherapists = await db.query.users.findMany({
    where: specialtyFilter,
    columns: { id: true, name: true, specialty: true, image: true },
  });

  if (matchingTherapists.length === 0) return [];

  // For each therapist, get their available slots for that date
  const date = new Date(dateStr + "T12:00:00");
  const dayOfWeek = date.getDay();
  const now = new Date();

  const dayStart = parseChileDateTime(`${dateStr}T00:00`);
  const dayEnd = parseChileDateTime(`${dateStr}T23:59`);

  const results: {
    id: string;
    name: string;
    specialty: string | null;
    image: string | null;
    slots: { time: string; modality: string }[];
  }[] = [];

  for (const therapist of matchingTherapists) {
    // Get schedule for this day
    const schedule = await db.query.therapistAvailability.findMany({
      where: and(
        eq(therapistAvailability.therapistId, therapist.id),
        eq(therapistAvailability.dayOfWeek, dayOfWeek),
        eq(therapistAvailability.active, true)
      ),
    });

    if (schedule.length === 0) continue;

    // Check for schedule exceptions (day off)
    const exception = await db.query.therapistExceptions.findFirst({
      where: and(
        eq(therapistExceptions.therapistId, therapist.id),
        eq(therapistExceptions.date, dateStr),
      ),
    });
    if (exception) continue; // Therapist is off this day

    // Get existing appointments
    const existingAppts = await db
      .select({
        dateTime: appointments.dateTime,
        durationMinutes: appointments.durationMinutes,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.therapistId, therapist.id),
          gte(appointments.dateTime, dayStart),
          lte(appointments.dateTime, dayEnd),
          inArray(appointments.status, ["programada", "completada"])
        )
      );

    // Generate available slots
    const slots: { time: string; modality: string }[] = [];

    for (const block of schedule) {
      const [startH, startM] = block.startTime.split(":").map(Number);
      const [endH, endM] = block.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const slotDuration = block.slotDurationMinutes;

      for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

        const slotDateTime = parseChileDateTime(`${dateStr}T${timeStr}`);
        if (slotDateTime <= now) continue;

        const slotEnd = new Date(slotDateTime.getTime() + slotDuration * 60000);
        const hasConflict = existingAppts.some((appt) => {
          const apptStart = new Date(appt.dateTime).getTime();
          const apptEnd = apptStart + appt.durationMinutes * 60000;
          return slotDateTime.getTime() < apptEnd && slotEnd.getTime() > apptStart;
        });

        if (!hasConflict) {
          slots.push({ time: timeStr, modality: block.modality });
        }
      }
    }

    if (slots.length > 0) {
      results.push({ ...therapist, slots });
    }
  }

  return results;
}

/**
 * Get therapists available for this patient to book with.
 * Only returns therapists on the patient's care team who have availability configured.
 */
export async function getBookableTherapists() {
  const session = await auth();
  if (!session?.user) return [];

  const isPatient = session.user.role === "paciente";
  const patientId = session.user.linkedPatientId;

  // If impersonating as patient without a linked patient, or admin testing,
  // show all therapists with availability
  if (!patientId) {
    const allAvailability = await db.query.therapistAvailability.findMany({
      where: eq(therapistAvailability.active, true),
      with: { therapist: { columns: { id: true, name: true, specialty: true, image: true } } },
    });
    const unique = new Map<string, { id: string; name: string; specialty: string | null; image: string | null }>();
    for (const a of allAvailability) {
      if (a.therapist && !unique.has(a.therapist.id)) unique.set(a.therapist.id, a.therapist);
    }
    return Array.from(unique.values());
  }

  // Real patient: get care team + primary therapist
  const [team, patient] = await Promise.all([
    db.query.careTeamMembers.findMany({
      where: eq(careTeamMembers.patientId, patientId),
      with: { user: { columns: { id: true, name: true, specialty: true, image: true } } },
    }),
    db.query.patients.findFirst({
      where: eq(patients.id, patientId),
      columns: { primaryTherapistId: true },
      with: { primaryTherapist: { columns: { id: true, name: true, specialty: true, image: true } } },
    }),
  ]);

  // Combine care team + primary therapist (deduplicate)
  const therapistMap = new Map<string, { id: string; name: string; specialty: string | null; image: string | null }>();
  for (const m of team) therapistMap.set(m.user.id, m.user);
  if (patient?.primaryTherapist) therapistMap.set(patient.primaryTherapist.id, patient.primaryTherapist);

  const therapistIds = Array.from(therapistMap.keys());
  if (therapistIds.length === 0) return [];

  // Filter to those with availability
  const availability = await db.query.therapistAvailability.findMany({
    where: and(
      inArray(therapistAvailability.therapistId, therapistIds),
      eq(therapistAvailability.active, true)
    ),
  });

  const withAvail = new Set(availability.map((a) => a.therapistId));
  return Array.from(therapistMap.values()).filter((t) => withAvail.has(t.id));
}

/**
 * Get available time slots for a therapist on a specific date.
 * Checks therapist schedule, then removes already-booked slots.
 */
export async function getAvailableSlots(therapistId: string, dateStr: string) {
  const session = await auth();
  if (!session?.user) return [];

  // Parse the date and get day of week
  const date = new Date(dateStr + "T12:00:00");
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...

  // Get therapist's schedule for this day
  const schedule = await db.query.therapistAvailability.findMany({
    where: and(
      eq(therapistAvailability.therapistId, therapistId),
      eq(therapistAvailability.dayOfWeek, dayOfWeek),
      eq(therapistAvailability.active, true)
    ),
  });

  if (schedule.length === 0) return [];

  // Check for schedule exceptions (day off)
  const exception = await db.query.therapistExceptions.findFirst({
    where: and(
      eq(therapistExceptions.therapistId, therapistId),
      eq(therapistExceptions.date, dateStr),
    ),
  });
  if (exception) return []; // Therapist is off this day

  // Get existing appointments for this therapist on this date
  const dayStart = parseChileDateTime(`${dateStr}T00:00`);
  const dayEnd = parseChileDateTime(`${dateStr}T23:59`);

  const existingAppts = await db
    .select({
      dateTime: appointments.dateTime,
      durationMinutes: appointments.durationMinutes,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.therapistId, therapistId),
        gte(appointments.dateTime, dayStart),
        lte(appointments.dateTime, dayEnd),
        inArray(appointments.status, ["programada", "completada"])
      )
    );

  // Generate slots from schedule, removing booked ones
  const slots: { time: string; modality: string }[] = [];
  const now = new Date();

  for (const block of schedule) {
    const [startH, startM] = block.startTime.split(":").map(Number);
    const [endH, endM] = block.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const slotDuration = block.slotDurationMinutes;

    for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

      // Check if this slot is in the past
      const slotDateTime = parseChileDateTime(`${dateStr}T${timeStr}`);
      if (slotDateTime <= now) continue;

      // Check if this slot conflicts with existing appointments
      const slotEnd = new Date(slotDateTime.getTime() + slotDuration * 60000);
      const hasConflict = existingAppts.some((appt) => {
        const apptStart = new Date(appt.dateTime).getTime();
        const apptEnd = apptStart + appt.durationMinutes * 60000;
        return slotDateTime.getTime() < apptEnd && slotEnd.getTime() > apptStart;
      });

      if (!hasConflict) {
        slots.push({ time: timeStr, modality: block.modality });
      }
    }
  }

  return slots;
}

/**
 * Book an appointment as a patient.
 * Only with care team therapists, only in available slots.
 */
export async function bookAppointment(data: {
  therapistId: string;
  date: string; // "2025-04-15"
  time: string; // "10:00"
  modality: "presencial" | "online";
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado." };

  const patientId = session.user.linkedPatientId;
  if (!patientId) return { error: "No tiene un perfil de paciente vinculado." };

  // Verify the slot is actually available (re-check to prevent race conditions)
  const slots = await getAvailableSlots(data.therapistId, data.date);
  const slotAvailable = slots.some((s) => s.time === data.time);
  if (!slotAvailable) return { error: "Este horario ya no esta disponible. Por favor seleccione otro." };

  // Get slot duration from therapist availability
  const date = new Date(data.date + "T12:00:00");
  const schedule = await db.query.therapistAvailability.findFirst({
    where: and(
      eq(therapistAvailability.therapistId, data.therapistId),
      eq(therapistAvailability.dayOfWeek, date.getDay()),
      eq(therapistAvailability.active, true)
    ),
  });
  const durationMinutes = schedule?.slotDurationMinutes ?? 50;

  const dateTime = parseChileDateTime(`${data.date}T${data.time}`);

  // Create the appointment
  let meetingLink: string | null = null;
  let googleEventId: string | null = null;

  if (data.modality === "online") {
    try {
      const { createCalendarEvent, hasGoogleCalendarAccess } = await import("@/lib/google-calendar");
      const hasAccess = await hasGoogleCalendarAccess(data.therapistId);
      if (hasAccess) {
        const { patients } = await import("@/lib/db/schema");
        const patient = await db.query.patients.findFirst({
          where: eq(patients.id, patientId),
          columns: { firstName: true, lastName: true, email: true },
        });
        const result = await createCalendarEvent(data.therapistId, {
          summary: `Sesion - ${patient?.firstName} ${patient?.lastName}`,
          startDateTime: dateTime,
          durationMinutes,
          addMeetLink: true,
          attendeeEmails: patient?.email ? [patient.email] : [],
        });
        meetingLink = result.meetLink;
        googleEventId = result.eventId;
      }
    } catch {
      // Continue without Meet link
    }
  }

  const [appt] = await db
    .insert(appointments)
    .values({
      patientId,
      therapistId: data.therapistId,
      dateTime,
      durationMinutes,
      status: "programada",
      sessionType: "individual",
      modality: data.modality,
      meetingLink,
      googleEventId,
      notes: data.notes || null,
      createdBy: session.user.id,
    })
    .returning({ id: appointments.id });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "appointment",
    entityId: appt.id,
    details: { bookedBy: "patient" },
  });

  notifyAppointmentCreated(appt.id).catch(() => {});
  createAppointmentReminder(appt.id).catch(() => {});

  revalidatePath("/mis-citas");
  return { success: true, appointmentId: appt.id };
}
