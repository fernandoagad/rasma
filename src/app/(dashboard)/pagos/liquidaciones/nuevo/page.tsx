import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTherapists } from "@/actions/payouts";
import { PageHeader } from "@/components/ui/page-header";
import { PayoutCalculator } from "@/components/payouts/payout-calculator";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NuevoLiquidacionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const therapists = await getTherapists();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link
        href="/pagos/liquidaciones"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rasma-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a liquidaciones
      </Link>

      <PageHeader
        title="Nueva Liquidación"
        subtitle="Calcule y registre la liquidación de un terapeuta."
      />

      <PayoutCalculator therapists={therapists} />
    </div>
  );
}
