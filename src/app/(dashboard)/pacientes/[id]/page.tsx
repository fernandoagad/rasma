import { auth } from "@/lib/auth";
import { getPatientById } from "@/actions/patients";
import { getPatientAppointments, getPatientPayments, getPatientNotes, getPatientPlans, getPatientSummary } from "@/actions/patient-detail";
import { getPatientFiles } from "@/actions/patient-files";
import { PatientDetail } from "@/components/patients/patient-detail";
import { notFound, redirect } from "next/navigation";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const [patient, patientAppointments, patientPayments, patientNotes, patientPlans, summary, patientFilesList] = await Promise.all([
    getPatientById(id),
    getPatientAppointments(id),
    getPatientPayments(id),
    getPatientNotes(id),
    getPatientPlans(id),
    getPatientSummary(id),
    getPatientFiles(id),
  ]);

  if (!patient) notFound();

  return (
    <PatientDetail
      patient={patient}
      userRole={session.user.role}
      appointments={patientAppointments}
      payments={patientPayments}
      notes={patientNotes}
      plans={patientPlans}
      summary={summary}
      files={patientFilesList}
    />
  );
}
