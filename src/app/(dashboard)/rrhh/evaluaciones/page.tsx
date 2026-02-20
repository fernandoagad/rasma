import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getAllEvaluations } from "@/actions/staff";
import { EvaluationsList } from "@/components/rrhh/evaluations-list";

export default async function EvaluacionesPage() {
  const session = await auth();
  if (!session?.user || !["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const evaluations = await getAllEvaluations();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Evaluaciones" subtitle="Evaluaciones de desempeño del equipo" />
      <EvaluationsList evaluations={evaluations} />
    </div>
  );
}
