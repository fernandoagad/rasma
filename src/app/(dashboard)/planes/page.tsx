import { getTreatmentPlans } from "@/actions/plans";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpandablePlan } from "@/components/plans/expandable-plan";
import { Suspense } from "react";

const planFilters = [
  {
    key: "status",
    label: "Estado",
    options: [
      { value: "all", label: "Todos" },
      { value: "activo", label: "Activos" },
      { value: "completado", label: "Completados" },
      { value: "suspendido", label: "Suspendidos" },
    ],
  },
];

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "recepcionista") redirect("/");

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { plans, total, totalPages, currentPage } = await getTreatmentPlans({
    status: params.status,
    page,
  });

  const canEdit = ["admin", "terapeuta"].includes(session.user.role);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Planes de Tratamiento"
        subtitle={`${total} planes`}
        action={
          canEdit ? (
            <Link href="/planes/nuevo">
              <Button className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Plan
              </Button>
            </Link>
          ) : undefined
        }
      />

      <Suspense>
        <FilterBar filters={planFilters} basePath="/planes" />
      </Suspense>

      {plans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay planes de tratamiento"
          description="Cree un nuevo plan para comenzar."
        />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <ExpandablePlan
              key={plan.id}
              plan={plan}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/planes?status=${params.status || "all"}&page=${p}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                p === currentPage ? "bg-rasma-dark text-rasma-lime" : "bg-muted hover:bg-muted/80"
              }`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
