"use server";

import { requireStaff } from "@/lib/authorization";
import { db } from "@/lib/db";
import { patients, users, appointments } from "@/lib/db/schema";
import { or, like, desc, gte, eq, sql } from "drizzle-orm";

export async function globalSearch(query: string) {
  await requireStaff();
  if (!query || query.length < 2) return { patients: [], professionals: [], appointments: [] };

  const q = `%${query}%`;

  const [patientResults, professionalResults, appointmentResults] = await Promise.all([
    // Search patients by name, RUT, email (including full name)
    db.query.patients.findMany({
      where: or(
        like(patients.firstName, q),
        like(patients.lastName, q),
        like(patients.rut, q),
        like(patients.email, q),
        sql`(${patients.firstName} || ' ' || ${patients.lastName}) LIKE ${q}`,
      ),
      columns: { id: true, firstName: true, lastName: true, rut: true, status: true },
      limit: 5,
    }),
    // Search professionals by name, specialty
    db.query.users.findMany({
      where: or(
        like(users.name, q),
        like(users.specialty, q),
        like(users.email, q)
      ),
      columns: { id: true, name: true, role: true, specialty: true, image: true },
      limit: 5,
    }),
    // Search upcoming appointments
    db.query.appointments.findMany({
      where: gte(appointments.dateTime, new Date()),
      with: {
        patient: { columns: { firstName: true, lastName: true } },
        therapist: { columns: { name: true } },
      },
      orderBy: [appointments.dateTime],
      limit: 5,
    }),
  ]);

  // Filter appointments that match the query (by patient name or therapist name)
  const filteredAppointments = appointmentResults.filter((a) => {
    const patientName = `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase();
    const therapistName = a.therapist.name.toLowerCase();
    const q2 = query.toLowerCase();
    return patientName.includes(q2) || therapistName.includes(q2);
  });

  return {
    patients: patientResults,
    professionals: professionalResults,
    appointments: filteredAppointments.slice(0, 3),
  };
}
