import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getAllBenefits } from "@/actions/staff";
import { BenefitsList } from "@/components/rrhh/benefits-list";

export default async function BeneficiosPage() {
  const session = await auth();
  if (!session?.user || !["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const benefits = await getAllBenefits();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Beneficios" subtitle="Gestión de beneficios del equipo" />
      <BenefitsList benefits={benefits} />
    </div>
  );
}
