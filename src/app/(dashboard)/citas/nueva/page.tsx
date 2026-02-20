import { getTherapists, getPatientsList } from "@/actions/appointments";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;

  const [therapists, patients] = await Promise.all([
    getTherapists(),
    getPatientsList(),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/citas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a citas
      </Link>

      <PageHeader
        title="Nueva Cita"
        subtitle="Complete los pasos para agendar una nueva cita"
      />

      <AppointmentForm
        therapists={therapists}
        patients={patients}
        userId={session.user.id}
        userRole={session.user.role}
        defaultDate={params.date}
      />
    </div>
  );
}
