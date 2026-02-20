import { getPatientById, getTherapists, updatePatient } from "@/actions/patients";
import { PatientForm } from "@/components/patients/patient-form";
import { UI } from "@/constants/ui";
import { notFound } from "next/navigation";

export default async function EditarPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [patient, therapists] = await Promise.all([
    getPatientById(id),
    getTherapists(),
  ]);

  if (!patient) notFound();

  const boundAction = updatePatient.bind(null, id);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">{UI.patients.editPatient}</h1>
      <PatientForm
        patient={patient}
        therapists={therapists}
        action={boundAction}
        isEdit
      />
    </div>
  );
}
