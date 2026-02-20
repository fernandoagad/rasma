"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appointments, careTeamMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Get appointments for the currently logged-in patient
export async function getMyAppointments() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");
  if (session.user.role !== "paciente" || !session.user.linkedPatientId) {
    return [];
  }

  return db.query.appointments.findMany({
    where: eq(appointments.patientId, session.user.linkedPatientId),
    with: {
      therapist: {
        columns: { id: true, name: true, specialty: true, image: true },
      },
    },
    orderBy: [desc(appointments.dateTime)],
    limit: 50,
  });
}

// Cancel a patient's own future appointment
export async function cancelMyAppointment(appointmentId: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado." };
  if (session.user.role !== "paciente" || !session.user.linkedPatientId) {
    return { error: "Acceso denegado." };
  }

  // Verify the appointment belongs to this patient
  const appointment = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.id, appointmentId),
      eq(appointments.patientId, session.user.linkedPatientId)
    ),
  });

  if (!appointment) return { error: "Cita no encontrada." };
  if (appointment.status !== "programada")
    return { error: "Solo se pueden cancelar citas programadas." };
  if (appointment.dateTime < new Date())
    return { error: "No se puede cancelar una cita pasada." };

  await db
    .update(appointments)
    .set({ status: "cancelada", updatedAt: new Date() })
    .where(eq(appointments.id, appointmentId));

  return { success: true };
}

// Get care team professionals for the patient
export async function getMyProfessionals() {
  const session = await auth();
  if (!session?.user) return [];
  if (session.user.role !== "paciente" || !session.user.linkedPatientId)
    return [];

  return db.query.careTeamMembers.findMany({
    where: eq(careTeamMembers.patientId, session.user.linkedPatientId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          specialty: true,
          image: true,
        },
      },
    },
  });
}
