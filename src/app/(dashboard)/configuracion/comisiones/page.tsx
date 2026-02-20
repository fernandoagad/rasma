import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCommissionRates } from "@/actions/commissions";
import { PageHeader } from "@/components/ui/page-header";
import { CommissionRatesForm } from "./commission-rates-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ComisionesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const rates = await getCommissionRates();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link
        href="/configuracion"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rasma-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a configuración
      </Link>

      <PageHeader
        title="Comisiones y Tarifas"
        subtitle="Configure los porcentajes de comisión de la fundación y las tarifas de pago a profesionales."
      />

      <CommissionRatesForm rates={rates} />
    </div>
  );
}
