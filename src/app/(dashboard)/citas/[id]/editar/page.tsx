import { getAppointmentById, getTherapists, getPatientsList } from "@/actions/appointments";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppointmentEditForm } from "@/components/appointments/appointment-edit-form";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditarCitaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const [appointment, therapists, patients] = await Promise.all([
    getAppointmentById(id),
    getTherapists(),
    getPatientsList(),
  ]);

  // Only allow editing scheduled appointments
  if (appointment.status !== "programada") {
    redirect(`/citas/${id}`);
  }

  const serialized = {
    id: appointment.id,
    patientId: appointment.patientId,
    therapistId: appointment.therapistId,
    dateTime: appointment.dateTime.toISOString(),
    durationMinutes: appointment.durationMinutes,
    status: appointment.status,
    sessionType: appointment.sessionType,
    modality: appointment.modality,
    location: appointment.location,
    meetingLink: appointment.meetingLink,
    notes: appointment.notes,
    price: appointment.price,
    patient: {
      id: appointment.patient.id,
      firstName: appointment.patient.firstName,
      lastName: appointment.patient.lastName,
    },
    therapist: {
      id: appointment.therapist.id,
      name: appointment.therapist.name,
    },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={`/citas/${id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a detalle
      </Link>

      <PageHeader
        title="Editar Cita"
        subtitle={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
      />

      <AppointmentEditForm
        appointment={serialized}
        therapists={therapists}
        patients={patients}
        userId={session.user.id}
        userRole={session.user.role}
      />
    </div>
  );
}
