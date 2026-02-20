import { getTherapists, createPatient } from "@/actions/patients";
import { PatientForm } from "@/components/patients/patient-form";
import { UI } from "@/constants/ui";

export default async function NuevoPacientePage() {
  const therapists = await getTherapists();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">{UI.patients.newPatient}</h1>
      <PatientForm therapists={therapists} action={createPatient} />
    </div>
  );
}
