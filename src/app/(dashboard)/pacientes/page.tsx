import { getPatientsEnriched, getTherapists } from "@/actions/patients";
import { PatientTable } from "@/components/patients/patient-table";
import { PatientSearch } from "@/components/patients/patient-search";
import { Pagination } from "@/components/patients/pagination";
import { Button } from "@/components/ui/button";
import { UI } from "@/constants/ui";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const [{ patients, total, page, pageSize, totalPages }, therapists] = await Promise.all([
    getPatientsEnriched({
      search: params.q,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    }),
    getTherapists(),
  ]);

  const activeCount = patients.filter((p) => p.status === "activo").length;
  const hasFilters = !!(params.q || params.status);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-rasma-dark text-rasma-lime flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-rasma-dark tracking-tight">{UI.patients.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {total} registrados
                {!hasFilters && activeCount > 0 && (
                  <> · <span className="font-medium text-rasma-dark">{activeCount} activos</span></>
                )}
              </p>
            </div>
          </div>
        </div>

        <Link href="/pacientes/nuevo">
          <Button className="h-11 px-5 text-base font-semibold rounded-xl gap-2 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
            <Plus className="h-5 w-5" />
            {UI.patients.newPatient}
          </Button>
        </Link>
      </div>

      {/* ═══ SEARCH & FILTERS ═══ */}
      <Suspense>
        <PatientSearch />
      </Suspense>

      {/* ═══ TABLE ═══ */}
      <PatientTable patients={patients} therapists={therapists} userRole={session.user.role} />

      {/* ═══ PAGINATION ═══ */}
      <Suspense>
        <Pagination
          total={total}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
        />
      </Suspense>
    </div>
  );
}
