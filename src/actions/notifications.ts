"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { systemSettings, notificationPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendTestEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

// ============================================================
// System notification settings
// ============================================================

const SETTING_KEYS = [
  "notifications_enabled",
  "reminder_hours_default",
  "notify_appointment_created",
  "notify_appointment_updated",
  "notify_appointment_cancelled",
  "notify_appointment_status",
  "notify_payment_received",
  "notify_payment_status",
  "notify_treatment_plan",
];

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
};

export async function getNotificationSettings(): Promise<Record<string, string>> {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");
  if (session.user.role !== "admin") throw new Error("No autorizado.");

  const rows = await db.select().from(systemSettings);
  const map: Record<string, string> = {};
  for (const key of SETTING_KEYS) {
    const row = rows.find((r) => r.key === key);
    map[key] = row?.value ?? DEFAULTS[key] ?? "";
  }
  return map;
}

export async function updateNotificationSettings(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado." };
  if (session.user.role !== "admin") return { error: "No autorizado." };

  const updates: Record<string, string> = {};
  for (const key of SETTING_KEYS) {
    const value = formData.get(key);
    if (key === "reminder_hours_default") {
      updates[key] = String(Math.max(1, Math.min(72, Number(value) || 24)));
    } else {
      updates[key] = value === "on" || value === "true" ? "true" : "false";
    }
  }

  // Upsert each setting
  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key),
    });
    if (existing) {
      await db.update(systemSettings).set({ value, updatedAt: new Date() }).where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value });
    }
  }

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "notification_settings",
    details: updates,
  });

  revalidatePath("/configuracion/notificaciones");
  return { success: true };
}

// ============================================================
// Test email
// ============================================================

export async function sendTestNotification(): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado." };
  if (session.user.role !== "admin") return { error: "No autorizado." };

  const email = session.user.email;
  if (!email) return { error: "No tiene email configurado." };

  const success = await sendTestEmail(email);
  if (!success) return { error: "Error al enviar email. Verifique la configuración de Gmail." };

  return { success: true };
}

// ============================================================
// Patient notification preferences
// ============================================================

export async function getPatientNotificationPrefs(patientId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  const prefs = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.patientId, patientId),
  });

  return prefs || {
    patientId,
    emailEnabled: true,
    whatsappEnabled: false,
    whatsappNumber: null,
    reminderHoursBefore: 24,
  };
}

export async function updatePatientNotificationPrefs(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado." };

  const patientId = formData.get("patientId") as string;
  if (!patientId) return { error: "Paciente no especificado." };

  const emailEnabled = formData.get("emailEnabled") === "on";
  const whatsappEnabled = formData.get("whatsappEnabled") === "on";
  const whatsappNumber = (formData.get("whatsappNumber") as string) || null;
  const reminderHoursBefore = Math.max(1, Math.min(72, Number(formData.get("reminderHoursBefore")) || 24));

  const existing = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.patientId, patientId),
  });

  if (existing) {
    await db.update(notificationPreferences).set({
      emailEnabled,
      whatsappEnabled,
      whatsappNumber,
      reminderHoursBefore,
      updatedAt: new Date(),
    }).where(eq(notificationPreferences.patientId, patientId));
  } else {
    await db.insert(notificationPreferences).values({
      patientId,
      emailEnabled,
      whatsappEnabled,
      whatsappNumber,
      reminderHoursBefore,
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "notification_preferences",
    entityId: patientId,
    details: { emailEnabled, whatsappEnabled, reminderHoursBefore },
  });

  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/configuracion/notificaciones");
  return { success: true };
}

// ============================================================
// Overview data for admin
// ============================================================

export async function getNotificationOverview() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");
  if (session.user.role !== "admin") throw new Error("No autorizado.");

  const allPrefs = await db.query.notificationPreferences.findMany({
    with: {
      patient: { columns: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  return {
    configured: allPrefs.length,
    emailEnabled: allPrefs.filter((p) => p.emailEnabled).length,
    whatsappEnabled: allPrefs.filter((p) => p.whatsappEnabled).length,
    preferences: allPrefs,
  };
}
