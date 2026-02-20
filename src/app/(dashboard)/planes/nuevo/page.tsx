import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPatientsList } from "@/actions/appointments";
import { PlanForm } from "@/components/plans/plan-form";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NuevoPlanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "terapeuta"].includes(session.user.role)) redirect("/");

  const patients = await getPatientsList();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/planes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a planes
      </Link>

      <PageHeader
        title="Nuevo Plan de Tratamiento"
        subtitle="Defina los objetivos, intervenciones y seguimiento del paciente"
      />

      <PlanForm patients={patients} />
    </div>
  );
}
