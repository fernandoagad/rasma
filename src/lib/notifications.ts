import { db } from "@/lib/db";
import { appointments, patients, reminders, notificationPreferences, systemSettings, payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendAppointmentStatusUpdate,
  sendAppointmentUpdated,
  sendAppointmentReminder,
  sendPaymentConfirmation,
  sendPaymentStatusUpdate,
  sendTreatmentPlanCreated,
  sendTreatmentPlanStatusUpdate,
  sendPayoutProcessed,
  type AppointmentEmailData,
  type PaymentEmailData,
  type TreatmentPlanEmailData,
} from "@/lib/email";

// ============================================================
// System settings helpers
// ============================================================

const DEFAULTS: Record<string, string> = {
  notifications_enabled: "true",
  reminder_hours_default: "24",
  notify_appointment_created: "true",
  notify_appointment_updated: "true",
  notify_appointment_cancelled: "true",
  notify_appointment_status: "true",
  notify_payment_received: "true",
  notify_payment_status: "true",
  notify_treatment_plan: "true",
  notify_payout_processed: "true",
};

export async function getSetting(key: string): Promise<string> {
  const row = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, key),
  });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.select().from(systemSettings);
  const map: Record<string, string> = {};
  for (const key of keys) {
    const row = rows.find((r) => r.key === key);
    map[key] = row?.value ?? DEFAULTS[key] ?? "";
  }
  return map;
}

export async function isNotificationsEnabled(): Promise<boolean> {
  return (await getSetting("notifications_enabled")) === "true";
}

// ============================================================
// Helpers
// ============================================================

async function getAppointmentEmailData(appointmentId: string): Promise<{
  data: AppointmentEmailData;
  patientEmail: string | null;
  patientId: string;
} | null> {
  const appt = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
    with: {
      patient: { columns: { id: true, firstName: true, lastName: true, email: true } },
      therapist: { columns: { id: true, name: true } },
    },
  });
  if (!appt) return null;

  const dateStr = new Date(appt.dateTime).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return {
    data: {
      patientName: `${appt.patient.firstName} ${appt.patient.lastName}`,
      therapistName: appt.therapist.name,
      dateTime: dateStr,
      duration: appt.durationMinutes,
      sessionType: appt.sessionType,
      modality: appt.modality,
      location: appt.location,
      meetingLink: appt.meetingLink,
    },
    patientEmail: appt.patient.email,
    patientId: appt.patient.id,
  };
}

async function shouldNotifyPatient(patientId: string): Promise<boolean> {
  const prefs = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.patientId, patientId),
  });
  return prefs?.emailEnabled !== false;
}

// ============================================================
// Appointment notifications
// ============================================================

export async function notifyAppointmentCreated(appointmentId: string): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;
    if ((await getSetting("notify_appointment_created")) !== "true") return;

    const result = await getAppointmentEmailData(appointmentId);
    if (!result?.patientEmail) return;
    if (!(await shouldNotifyPatient(result.patientId))) return;

    await sendAppointmentConfirmation(result.patientEmail, result.data);
  } catch (e) {
    console.error("Failed to notify appointment created:", e);
  }
}

export async function notifyAppointmentUpdated(appointmentId: string, changes: string): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;
    if ((await getSetting("notify_appointment_updated")) !== "true") return;

    const result = await getAppointmentEmailData(appointmentId);
    if (!result?.patientEmail) return;
    if (!(await shouldNotifyPatient(result.patientId))) return;

    await sendAppointmentUpdated(result.patientEmail, result.data, changes);
  } catch (e) {
    console.error("Failed to notify appointment updated:", e);
  }
}

export async function notifyAppointmentStatusChanged(
  appointmentId: string,
  newStatus: string
): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;

    const result = await getAppointmentEmailData(appointmentId);
    if (!result?.patientEmail) return;
    if (!(await shouldNotifyPatient(result.patientId))) return;

    if (newStatus === "cancelada") {
      if ((await getSetting("notify_appointment_cancelled")) !== "true") return;
      await sendAppointmentCancellation(result.patientEmail, result.data);
    } else {
      if ((await getSetting("notify_appointment_status")) !== "true") return;
      await sendAppointmentStatusUpdate(result.patientEmail, result.data, newStatus);
    }
  } catch (e) {
    console.error("Failed to notify appointment status change:", e);
  }
}

// ============================================================
// Reminder creation
// ============================================================

export async function createAppointmentReminder(appointmentId: string): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;

    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
      with: { patient: { columns: { id: true } } },
    });
    if (!appt) return;

    const prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.patientId, appt.patient.id),
    });

    if (prefs && !prefs.emailEnabled) return;

    const hoursBefore = prefs?.reminderHoursBefore ?? (parseInt(await getSetting("reminder_hours_default")) || 24);
    const now = new Date();

    // Create primary reminder (patient preference, default 24h)
    const primaryTime = new Date(appt.dateTime.getTime() - hoursBefore * 60 * 60 * 1000);
    if (primaryTime > now) {
      await db.insert(reminders).values({
        appointmentId,
        channel: "email",
        scheduledAt: primaryTime,
      });
    }

    // Create 1-hour-before reminder (if different from primary)
    if (hoursBefore !== 1) {
      const oneHourBefore = new Date(appt.dateTime.getTime() - 1 * 60 * 60 * 1000);
      if (oneHourBefore > now) {
        await db.insert(reminders).values({
          appointmentId,
          channel: "email",
          scheduledAt: oneHourBefore,
        });
      }
    }
  } catch (e) {
    console.error("Failed to create appointment reminder:", e);
  }
}

// ============================================================
// Payment notifications
// ============================================================

export async function notifyPaymentReceived(
  patientId: string,
  paymentData: Omit<PaymentEmailData, "patientName">
): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;
    if ((await getSetting("notify_payment_received")) !== "true") return;

    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
      columns: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!patient?.email) return;
    if (!(await shouldNotifyPatient(patientId))) return;

    await sendPaymentConfirmation(patient.email, {
      ...paymentData,
      patientName: `${patient.firstName} ${patient.lastName}`,
    });
  } catch (e) {
    console.error("Failed to notify payment received:", e);
  }
}

export async function notifyPaymentStatusChanged(
  paymentId: string,
  newStatus: string
): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;
    if ((await getSetting("notify_payment_status")) !== "true") return;

    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
      with: { patient: { columns: { id: true, firstName: true, lastName: true, email: true } } },
    });
    if (!payment?.patient?.email) return;
    if (!(await shouldNotifyPatient(payment.patient.id))) return;

    await sendPaymentStatusUpdate(payment.patient.email, {
      patientName: `${payment.patient.firstName} ${payment.patient.lastName}`,
      amount: `$${(payment.amount / 100).toLocaleString("es-CL")}`,
      date: payment.date,
      method: payment.paymentMethod,
      status: payment.status,
      receiptNumber: payment.receiptNumber,
    }, newStatus);
  } catch (e) {
    console.error("Failed to notify payment status change:", e);
  }
}

// ============================================================
// Treatment plan notifications
// ============================================================

export async function notifyTreatmentPlanCreated(
  patientId: string,
  planData: TreatmentPlanEmailData
): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;
    if ((await getSetting("notify_treatment_plan")) !== "true") return;

    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
      columns: { id: true, email: true },
    });
    if (!patient?.email) return;
    if (!(await shouldNotifyPatient(patientId))) return;

    await sendTreatmentPlanCreated(patient.email, planData);
  } catch (e) {
    console.error("Failed to notify treatment plan created:", e);
  }
}

export async function notifyTreatmentPlanStatusChanged(
  patientId: string,
  patientName: string,
  newStatus: string
): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;
    if ((await getSetting("notify_treatment_plan")) !== "true") return;

    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
      columns: { id: true, email: true },
    });
    if (!patient?.email) return;
    if (!(await shouldNotifyPatient(patientId))) return;

    await sendTreatmentPlanStatusUpdate(patient.email, patientName, newStatus);
  } catch (e) {
    console.error("Failed to notify treatment plan status change:", e);
  }
}

// ============================================================
// Payout notifications
// ============================================================

export async function notifyPayoutProcessed(
  therapistId: string,
  payoutData: {
    periodStart: string;
    periodEnd: string;
    grossAmount: number;
    commissionAmount: number;
    deductionAmount: number;
    netAmount: number;
    bankTransferRef?: string | null;
  }
): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;
    if ((await getSetting("notify_payout_processed")) !== "true") return;

    const therapist = await db.query.users.findFirst({
      where: (u, { eq: e }) => e(u.id, therapistId),
      columns: { id: true, name: true, email: true },
    });
    if (!therapist?.email) return;

    const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-CL");
    const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString("es-CL")}`;

    await sendPayoutProcessed(therapist.email, {
      therapistName: therapist.name,
      periodStart: fmtDate(payoutData.periodStart),
      periodEnd: fmtDate(payoutData.periodEnd),
      grossAmount: fmtMoney(payoutData.grossAmount),
      commissionAmount: fmtMoney(payoutData.commissionAmount),
      deductionAmount: fmtMoney(payoutData.deductionAmount),
      netAmount: fmtMoney(payoutData.netAmount),
      bankTransferRef: payoutData.bankTransferRef,
    });
  } catch (e) {
    console.error("Failed to notify payout processed:", e);
  }
}

// ============================================================
// Process pending reminders (called by cron)
// ============================================================

export async function processPendingReminders(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  const now = new Date();
  const stats = { processed: 0, sent: 0, errors: 0 };

  const pending = await db.query.reminders.findMany({
    where: and(eq(reminders.sent, false), eq(reminders.channel, "email")),
    with: {
      appointment: {
        with: {
          patient: { columns: { id: true, firstName: true, lastName: true, email: true } },
          therapist: { columns: { id: true, name: true, email: true } },
        },
      },
    },
    limit: 50,
  });

  for (const reminder of pending) {
    if (reminder.scheduledAt > now) continue;
    stats.processed++;

    const appt = reminder.appointment;
    if (appt.status !== "programada") {
      await db.update(reminders).set({ sent: true, sentAt: now, error: "appointment_not_active" }).where(eq(reminders.id, reminder.id));
      continue;
    }

    const hoursUntil = Math.max(1, Math.round((appt.dateTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
    const dateStr = new Date(appt.dateTime).toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const emailData: AppointmentEmailData = {
      patientName: `${appt.patient.firstName} ${appt.patient.lastName}`,
      therapistName: appt.therapist.name,
      dateTime: dateStr,
      duration: appt.durationMinutes,
      sessionType: appt.sessionType,
      modality: appt.modality,
      location: appt.location,
      meetingLink: appt.meetingLink,
    };

    let sentOk = true;

    // Send reminder to patient
    if (appt.patient.email) {
      const patientSent = await sendAppointmentReminder(appt.patient.email, emailData, hoursUntil);
      if (patientSent) stats.sent++;
      else sentOk = false;
    }

    // Send reminder to therapist (with Meet link included)
    if (appt.therapist.email) {
      const therapistSent = await sendAppointmentReminder(appt.therapist.email, emailData, hoursUntil);
      if (therapistSent) stats.sent++;
      else sentOk = false;
    }

    if (sentOk) {
      await db.update(reminders).set({ sent: true, sentAt: now }).where(eq(reminders.id, reminder.id));
    } else {
      stats.errors++;
      await db.update(reminders).set({ error: "send_failed" }).where(eq(reminders.id, reminder.id));
    }
  }

  return stats;
}
