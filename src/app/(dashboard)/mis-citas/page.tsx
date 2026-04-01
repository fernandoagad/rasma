import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getMyAppointments,
  getMyProfessionals,
  getMyPayments,
  getMyDocuments,
} from "@/actions/patient-portal";
import { PatientPortal } from "./patient-portal";

export default async function MisCitasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "paciente") redirect("/");

  const [appointments, professionals, payments, documents] = await Promise.all([
    getMyAppointments(),
    getMyProfessionals(),
    getMyPayments(),
    getMyDocuments(),
  ]);

  // No appointments yet → go straight to booking
  if (appointments.length === 0) {
    redirect("/mis-citas/agendar");
  }

  // Serialize dates for client components
  const serializedAppointments = appointments.map((apt) => ({
    ...apt,
    dateTime: apt.dateTime.toISOString(),
    createdAt: apt.createdAt.toISOString(),
    updatedAt: apt.updatedAt.toISOString(),
  }));

  const serializedPayments = payments.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    appointment: p.appointment
      ? {
          ...p.appointment,
          dateTime: p.appointment.dateTime.toISOString(),
        }
      : null,
  }));

  const serializedDocuments = documents.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <PatientPortal
      userName={session.user.name?.split(" ")[0] || "Paciente"}
      appointments={serializedAppointments}
      professionals={professionals}
      payments={serializedPayments}
      documents={serializedDocuments}
    />
  );
}
