import { getTreatmentPlans } from "@/actions/plans";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const activeCount = plans.filter((p) => p.status === "activo").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rasma-dark text-rasma-lime flex items-center justify-center">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-rasma-dark tracking-tight">Planes de Tratamiento</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total} planes
              {activeCount > 0 && (
                <> · <span className="font-medium text-rasma-dark">{activeCount} activo{activeCount !== 1 ? "s" : ""}</span></>
              )}
            </p>
          </div>
        </div>

        {canEdit && (
          <Link href="/planes/nuevo">
            <Button className="h-11 px-5 text-base font-semibold rounded-xl gap-2 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
              <Plus className="h-5 w-5" />
              Nuevo Plan
            </Button>
          </Link>
        )}
      </div>

      {/* ═══ FILTERS ═══ */}
      <Suspense>
        <FilterBar filters={planFilters} basePath="/planes" />
      </Suspense>

      {/* ═══ PLANS LIST ═══ */}
      {plans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay planes de tratamiento"
          description={params.status ? "No hay planes con este filtro." : "Cree un nuevo plan para comenzar."}
          action={
            canEdit && !params.status ? (
              <Link href="/planes/nuevo">
                <Button className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 gap-2">
                  <Plus className="h-4 w-4" /> Nuevo Plan
                </Button>
              </Link>
            ) : undefined
          }
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

      {/* ═══ PAGINATION ═══ */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 pt-4">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) pageNum = i + 1;
            else if (currentPage <= 4) pageNum = i + 1;
            else if (currentPage >= totalPages - 3) pageNum = totalPages - 6 + i;
            else pageNum = currentPage - 3 + i;
            return (
              <Link
                key={pageNum}
                href={`/planes?status=${params.status || "all"}&page=${pageNum}`}
                className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                  pageNum === currentPage
                    ? "bg-rasma-dark text-rasma-lime"
                    : "text-muted-foreground hover:bg-zinc-100"
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
