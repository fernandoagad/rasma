import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPayoutById } from "@/actions/payouts";
import { PageHeader } from "@/components/ui/page-header";
import { PayoutDetail } from "@/components/payouts/payout-detail";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const { id } = await params;
  const payout = await getPayoutById(id);

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
        title={`Liquidación — ${payout.therapist.name}`}
        subtitle={`${new Date(payout.periodStart + "T12:00:00").toLocaleDateString("es-CL")} — ${new Date(payout.periodEnd + "T12:00:00").toLocaleDateString("es-CL")}`}
      />

      <PayoutDetail payout={payout} userRole={session.user.role} />
    </div>
  );
}
