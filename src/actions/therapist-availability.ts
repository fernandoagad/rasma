"use server";

import { requireRole } from "@/lib/authorization";
import { db } from "@/lib/db";
import { therapistAvailability, therapistExceptions, users } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Get availability schedule for a therapist.
 */
export async function getTherapistAvailability(therapistId: string) {
  const session = await requireRole(["admin", "terapeuta"]);
  // Therapists can only view their own availability
  if (session.user.role === "terapeuta" && session.user.id !== therapistId) {
    return [];
  }

  return db.query.therapistAvailability.findMany({
    where: eq(therapistAvailability.therapistId, therapistId),
    orderBy: (a, { asc }) => [asc(a.dayOfWeek), asc(a.startTime)],
  });
}

/**
 * Set availability for a therapist — replaces all existing records.
 */
export async function setTherapistAvailability(
  therapistId: string,
  blocks: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes?: number;
    modality?: "presencial" | "online" | "ambos";
  }[]
) {
  const session = await requireRole(["admin", "terapeuta"]);
  // Therapists can only set their own
  if (session.user.role === "terapeuta" && session.user.id !== therapistId) {
    return { error: "No autorizado." };
  }

  // Delete existing
  await db.delete(therapistAvailability).where(eq(therapistAvailability.therapistId, therapistId));

  // Insert new
  if (blocks.length > 0) {
    await db.insert(therapistAvailability).values(
      blocks.map((b) => ({
        therapistId,
        dayOfWeek: b.dayOfWeek,
        startTime: b.startTime,
        endTime: b.endTime,
        slotDurationMinutes: b.slotDurationMinutes ?? 50,
        modality: b.modality ?? "ambos",
        active: true,
      }))
    );
  }

  revalidatePath("/configuracion/usuarios");
  return { success: true };
}

/**
 * Initialize default availability for ALL active therapists who don't have any yet.
 * Monday-Friday, 9:00-18:00, 50-minute slots.
 */
export async function initializeDefaultAvailability() {
  await requireRole(["admin"]);

  const therapists = await db.query.users.findMany({
    where: and(eq(users.role, "terapeuta"), eq(users.active, true)),
    columns: { id: true, name: true },
  });

  let created = 0;

  for (const therapist of therapists) {
    const existing = await db.query.therapistAvailability.findFirst({
      where: eq(therapistAvailability.therapistId, therapist.id),
    });

    if (!existing) {
      // Create Mon-Fri 9:00-13:00 and 14:00-18:00
      const blocks = [];
      for (let day = 1; day <= 5; day++) { // Mon=1 to Fri=5
        blocks.push({
          therapistId: therapist.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "13:00",
          slotDurationMinutes: 50,
          modality: "ambos" as const,
          active: true,
        });
        blocks.push({
          therapistId: therapist.id,
          dayOfWeek: day,
          startTime: "14:00",
          endTime: "18:00",
          slotDurationMinutes: 50,
          modality: "ambos" as const,
          active: true,
        });
      }
      await db.insert(therapistAvailability).values(blocks);
      created++;
    }
  }

  revalidatePath("/configuracion/usuarios");
  return { success: true, therapistsInitialized: created, totalTherapists: therapists.length };
}

/**
 * Check if a therapist has any availability configured.
 */
export async function hasAvailability(therapistId: string) {
  const session = await requireRole(["admin", "terapeuta"]);
  if (session.user.role === "terapeuta" && session.user.id !== therapistId) {
    return false;
  }
  const first = await db.query.therapistAvailability.findFirst({
    where: eq(therapistAvailability.therapistId, therapistId),
  });
  return !!first;
}

/**
 * Get schedule exceptions (days off) for a therapist.
 * Only returns future exceptions.
 */
export async function getTherapistExceptions(therapistId: string) {
  const session = await requireRole(["admin", "terapeuta"]);
  if (session.user.role === "terapeuta" && session.user.id !== therapistId) {
    return [];
  }

  const today = new Date().toISOString().split("T")[0];
  return db.query.therapistExceptions.findMany({
    where: and(
      eq(therapistExceptions.therapistId, therapistId),
      gte(therapistExceptions.date, today),
    ),
    orderBy: (e, { asc }) => [asc(e.date)],
  });
}

/**
 * Add schedule exceptions (days off / vacation).
 * Accepts a list of dates to block.
 */
export async function addTherapistExceptions(
  therapistId: string,
  dates: { date: string; reason?: string }[]
) {
  const session = await requireRole(["admin", "terapeuta"]);
  if (session.user.role === "terapeuta" && session.user.id !== therapistId) {
    return { error: "No autorizado." };
  }

  if (dates.length === 0) return { success: true };

  // Deduplicate — don't insert if already exists for that date
  const existing = await db.query.therapistExceptions.findMany({
    where: eq(therapistExceptions.therapistId, therapistId),
    columns: { date: true },
  });
  const existingDates = new Set(existing.map((e) => e.date));
  const newDates = dates.filter((d) => !existingDates.has(d.date));

  if (newDates.length > 0) {
    await db.insert(therapistExceptions).values(
      newDates.map((d) => ({
        therapistId,
        date: d.date,
        reason: d.reason || null,
      }))
    );
  }

  revalidatePath("/perfil");
  return { success: true, added: newDates.length };
}

/**
 * Remove a schedule exception.
 */
export async function removeTherapistException(exceptionId: string) {
  const session = await requireRole(["admin", "terapeuta"]);

  const exception = await db.query.therapistExceptions.findFirst({
    where: eq(therapistExceptions.id, exceptionId),
  });
  if (!exception) return { error: "No encontrado." };

  if (session.user.role === "terapeuta" && session.user.id !== exception.therapistId) {
    return { error: "No autorizado." };
  }

  await db.delete(therapistExceptions).where(eq(therapistExceptions.id, exceptionId));
  revalidatePath("/perfil");
  return { success: true };
}
