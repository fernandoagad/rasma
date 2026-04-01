import { requireStaff, requirePatientAccess } from "@/lib/authorization";
import { getPatientById } from "@/actions/patients";
import { getPatientDetailBundle } from "@/actions/patient-detail";
import { getPatientFiles } from "@/actions/patient-files";
import { PatientDetail } from "@/components/patients/patient-detail";
import { notFound } from "next/navigation";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireStaff();
  const { id } = await params;

  // Single auth check — all downstream calls skip redundant checks
  await requirePatientAccess(session, id);

  // 3 parallel calls instead of 7 (bundle consolidates 5 into 1)
  const [patient, bundle, files] = await Promise.all([
    getPatientById(id, true),
    getPatientDetailBundle(id),
    getPatientFiles(id, true),
  ]);

  if (!patient) notFound();

  return (
    <PatientDetail
      patient={patient}
      userRole={session.user.role}
      userId={session.user.id}
      appointments={bundle.appointments}
      payments={bundle.payments}
      notes={bundle.notes}
      plans={bundle.plans}
      summary={bundle.summary}
      files={files}
    />
  );
}
