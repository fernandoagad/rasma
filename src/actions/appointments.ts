"use server";

import { requireStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import { appointments, patients, users } from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte, or } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyAppointmentCreated, notifyAppointmentUpdated, notifyAppointmentStatusChanged, createAppointmentReminder } from "@/lib/notifications";

const PAGE_SIZE = 20;

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Seleccione un paciente"),
  therapistId: z.string().min(1, "Seleccione un terapeuta"),
  dateTime: z.string().min(1, "Seleccione fecha y hora"),
  durationMinutes: z.coerce.number().min(15).max(240).default(50),
  status: z.enum(["programada", "completada", "cancelada", "no_asistio"]).default("programada"),
  sessionType: z.enum(["individual", "pareja", "familiar", "grupal", "evaluacion"]).default("individual"),
  modality: z.enum(["presencial", "online"]).default("presencial"),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  notes: z.string().optional(),
  price: z.coerce.number().int().min(0).optional(),
});

export async function getAppointments(params?: {
  search?: string;
  status?: string;
  therapistId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}) {
  const session = await requireStaff();

  const page = params?.page || 1;
  const offset = (page - 1) * PAGE_SIZE;
  const conditions = [];

  if (session.user.role === "terapeuta") {
    conditions.push(eq(appointments.therapistId, session.user.id));
  }

  if (params?.status && params.status !== "all") {
    conditions.push(eq(appointments.status, params.status as "programada" | "completada" | "cancelada" | "no_asistio"));
  }

  if (params?.therapistId) {
    conditions.push(eq(appointments.therapistId, params.therapistId));
  }

  if (params?.dateFrom) {
    conditions.push(gte(appointments.dateTime, new Date(params.dateFrom)));
  }

  if (params?.dateTo) {
    conditions.push(lte(appointments.dateTime, new Date(params.dateTo + "T23:59:59")));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(appointments).where(where),
    db.query.appointments.findMany({
      where,
      with: {
        patient: { columns: { id: true, firstName: true, lastName: true } },
        therapist: { columns: { id: true, name: true } },
      },
      orderBy: [desc(appointments.dateTime)],
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  return {
    appointments: data,
    total: countResult[0].count,
    totalPages: Math.ceil(countResult[0].count / PAGE_SIZE),
    currentPage: page,
  };
}

export async function getAppointmentById(id: string) {
  const session = await requireStaff();

  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, id),
    with: {
      patient: true,
      therapist: { columns: { id: true, name: true, email: true } },
      sessionNote: true,
      payment: true,
    },
  });

  if (!appointment) throw new Error("Cita no encontrada.");

  if (session.user.role === "terapeuta" && appointment.therapistId !== session.user.id) {
    throw new Error("No autorizado.");
  }

  return appointment;
}

export async function createAppointment(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireStaff();

  const parsed = appointmentSchema.safeParse({
    patientId: formData.get("patientId") || undefined,
    therapistId: formData.get("therapistId") || undefined,
    dateTime: formData.get("dateTime") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
    status: formData.get("status") || "programada",
    sessionType: formData.get("sessionType") || undefined,
    modality: formData.get("modality") || undefined,
    location: formData.get("location") || undefined,
    meetingLink: formData.get("meetingLink") || undefined,
    notes: formData.get("notes") || undefined,
    price: formData.get("price") ? Number(formData.get("price")) : undefined,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(". ");
    return { error: msg };
  }

  // Auto-generate Google Meet link for online appointments
  let meetingLink: string | null = parsed.data.meetingLink || null;
  let googleEventId: string | null = null;
  let meetWarning: string | null = null;

  if (parsed.data.modality === "online" && !meetingLink) {
    try {
      const { createCalendarEvent, hasGoogleCalendarAccess } = await import("@/lib/google-calendar");
      const hasAccess = await hasGoogleCalendarAccess(parsed.data.therapistId);
      if (hasAccess) {
        const patient = await db.query.patients.findFirst({
          where: eq(patients.id, parsed.data.patientId),
          columns: { firstName: true, lastName: true, email: true },
        });
        const result = await createCalendarEvent(parsed.data.therapistId, {
          summary: `Sesión - ${patient?.firstName} ${patient?.lastName}`,
          startDateTime: new Date(parsed.data.dateTime),
          durationMinutes: parsed.data.durationMinutes,
          addMeetLink: true,
          attendeeEmails: patient?.email ? [patient.email] : [],
        });
        meetingLink = result.meetLink;
        googleEventId = result.eventId;
      } else {
        meetWarning = "El terapeuta no tiene Google Calendar conectado. La cita fue creada sin link de reunion.";
      }
    } catch (err) {
      console.error("Google Calendar integration failed:", err);
      meetWarning = "No se pudo generar el link de Google Meet. La cita fue creada sin link de reunion.";
    }
  }

  const [appt] = await db.insert(appointments).values({
    ...parsed.data,
    dateTime: new Date(parsed.data.dateTime),
    price: parsed.data.price ?? null,
    meetingLink,
    googleEventId,
    createdBy: session.user.id,
  }).returning({ id: appointments.id });

  await logAudit({
    userId: session.user.id,
    action: "create",
    entityType: "appointment",
    entityId: appt.id,
  });

  // Send notification and create reminder (non-blocking)
  notifyAppointmentCreated(appt.id).catch(() => {});
  createAppointmentReminder(appt.id).catch(() => {});

  revalidatePath("/citas");
  revalidatePath("/calendario");
  return { success: true, id: appt.id, warning: meetWarning };
}

export async function updateAppointment(
  id: string,
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireStaff();

  const parsed = appointmentSchema.partial().safeParse({
    patientId: formData.get("patientId") || undefined,
    therapistId: formData.get("therapistId") || undefined,
    dateTime: formData.get("dateTime") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
    status: formData.get("status") || undefined,
    sessionType: formData.get("sessionType") || undefined,
    modality: formData.get("modality") || undefined,
    location: formData.get("location") || undefined,
    meetingLink: formData.get("meetingLink") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.dateTime) {
    updates.dateTime = new Date(parsed.data.dateTime);
  }

  // Fetch old appointment to detect changes for notification
  const oldAppt = await db.query.appointments.findFirst({
    where: eq(appointments.id, id),
  });

  await db.update(appointments).set(updates).where(eq(appointments.id, id));

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "appointment",
    entityId: id,
  });

  // Build changes summary and notify patient (non-blocking)
  if (oldAppt) {
    const changesList: string[] = [];
    if (parsed.data.dateTime && new Date(parsed.data.dateTime).getTime() !== oldAppt.dateTime.getTime()) {
      changesList.push("Fecha/hora");
    }
    if (parsed.data.durationMinutes && parsed.data.durationMinutes !== oldAppt.durationMinutes) {
      changesList.push("Duración");
    }
    if (parsed.data.modality && parsed.data.modality !== oldAppt.modality) {
      changesList.push("Modalidad");
    }
    if (parsed.data.location && parsed.data.location !== oldAppt.location) {
      changesList.push("Ubicación");
    }
    if (parsed.data.sessionType && parsed.data.sessionType !== oldAppt.sessionType) {
      changesList.push("Tipo de sesión");
    }
    if (changesList.length > 0) {
      notifyAppointmentUpdated(id, changesList.join(", ")).catch(() => {});
    }
  }

  revalidatePath("/citas");
  revalidatePath(`/citas/${id}`);
  return { success: true };
}

export async function updateAppointmentStatus(id: string, status: string) {
  const session = await requireStaff();

  await db.update(appointments).set({
    status: status as "programada" | "completada" | "cancelada" | "no_asistio",
    updatedAt: new Date(),
  }).where(eq(appointments.id, id));

  await logAudit({
    userId: session.user.id,
    action: "update_status",
    entityType: "appointment",
    entityId: id,
    details: { status },
  });

  // Notify patient of status change (non-blocking)
  notifyAppointmentStatusChanged(id, status).catch(() => {});

  revalidatePath("/citas");
  return { success: true };
}

export async function getTherapists() {
  await requireStaff();

  return db.query.users.findMany({
    where: and(
      or(eq(users.role, "terapeuta"), eq(users.role, "admin")),
      eq(users.active, true)
    ),
    columns: { id: true, name: true, email: true },
  });
}

export async function getPatientsList() {
  await requireStaff();

  return db.query.patients.findMany({
    where: eq(patients.status, "activo"),
    columns: { id: true, firstName: true, lastName: true, rut: true },
    orderBy: [patients.lastName],
  });
}

// Cancel all future appointments in a recurring group
export async function cancelRecurringGroup(groupId: string, cancelFutureOnly = true) {
  const session = await requireStaff();

  const conditions = [eq(appointments.recurringGroupId, groupId)];

  if (cancelFutureOnly) {
    conditions.push(gte(appointments.dateTime, new Date()));
    conditions.push(eq(appointments.status, "programada"));
  }

  const toCancel = await db.query.appointments.findMany({
    where: and(...conditions),
    columns: { id: true },
  });

  if (toCancel.length === 0) return { error: "No hay citas futuras para cancelar." };

  await db.update(appointments).set({
    status: "cancelada",
    updatedAt: new Date(),
  }).where(and(...conditions));

  for (const appt of toCancel) {
    notifyAppointmentStatusChanged(appt.id, "cancelada").catch(() => {});
  }

  await logAudit({
    userId: session.user.id,
    action: "cancel_recurring",
    entityType: "appointment",
    details: { groupId, cancelledCount: toCancel.length },
  });

  revalidatePath("/citas");
  revalidatePath("/calendario");
  return { success: true, cancelledCount: toCancel.length };
}

// Get all appointments in a recurring group
export async function getRecurringGroupAppointments(groupId: string) {
  await requireStaff();

  return db.query.appointments.findMany({
    where: eq(appointments.recurringGroupId, groupId),
    with: {
      patient: { columns: { firstName: true, lastName: true } },
      therapist: { columns: { name: true } },
    },
    orderBy: (a, { asc }) => [asc(a.dateTime)],
  });
}

// Create recurring appointments (e.g., weekly for N weeks)
export async function createRecurringAppointments(data: {
  patientId: string;
  therapistId: string;
  startDateTime: string;
  durationMinutes: number;
  sessionType: string;
  modality: string;
  location?: string;
  notes?: string;
  recurrenceWeeks: number; // e.g., 8 for 8 weekly appointments
  addMeetLink?: boolean;
}) {
  const session = await requireStaff();

  const groupId = crypto.randomUUID();
  const startDate = new Date(data.startDateTime);
  const createdIds: string[] = [];

  for (let i = 0; i < data.recurrenceWeeks; i++) {
    const dateTime = new Date(startDate);
    dateTime.setDate(dateTime.getDate() + i * 7);

    // Auto-generate Google Meet link for online appointments
    let meetingLink: string | null = null;
    let googleEventId: string | null = null;

    if (data.modality === "online" && data.addMeetLink) {
      try {
        const { createCalendarEvent, hasGoogleCalendarAccess } = await import("@/lib/google-calendar");
        const hasAccess = await hasGoogleCalendarAccess(data.therapistId);
        if (hasAccess) {
          const patient = await db.query.patients.findFirst({
            where: eq(patients.id, data.patientId),
            columns: { firstName: true, lastName: true, email: true },
          });
          const result = await createCalendarEvent(data.therapistId, {
            summary: `Sesión - ${patient?.firstName} ${patient?.lastName}`,
            startDateTime: dateTime,
            durationMinutes: data.durationMinutes,
            addMeetLink: true,
            attendeeEmails: patient?.email ? [patient.email] : [],
          });
          meetingLink = result.meetLink;
          googleEventId = result.eventId;
        }
      } catch {
        // Google Calendar integration failed, continue without Meet link
      }
    }

    const [appt] = await db
      .insert(appointments)
      .values({
        patientId: data.patientId,
        therapistId: data.therapistId,
        dateTime,
        durationMinutes: data.durationMinutes,
        sessionType: data.sessionType as "individual" | "pareja" | "familiar" | "grupal" | "evaluacion",
        modality: data.modality as "presencial" | "online",
        location: data.location,
        meetingLink,
        googleEventId,
        notes: data.notes,
        recurringGroupId: groupId,
        recurringRule: JSON.stringify({ frequency: "weekly", count: data.recurrenceWeeks }),
        createdBy: session.user.id,
      })
      .returning({ id: appointments.id });

    createdIds.push(appt.id);

    // Create reminders (non-blocking)
    notifyAppointmentCreated(appt.id).catch(() => {});
    createAppointmentReminder(appt.id).catch(() => {});
  }

  await logAudit({
    userId: session.user.id,
    action: "create_recurring",
    entityType: "appointment",
    details: { groupId, count: data.recurrenceWeeks, ids: createdIds },
  });

  revalidatePath("/citas");
  revalidatePath("/calendario");
  return { success: true, groupId, count: createdIds.length };
}
