import { getPatientsEnriched, getTherapists } from "@/actions/patients";
import { PatientTable } from "@/components/patients/patient-table";
import { PatientSearch } from "@/components/patients/patient-search";
import { Pagination } from "@/components/patients/pagination";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { UI } from "@/constants/ui";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [{ patients, total, page, pageSize, totalPages }, therapists] = await Promise.all([
    getPatientsEnriched({
      search: params.q,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    }),
    getTherapists(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={UI.patients.title}
        subtitle={`${total} registrados`}
        action={
          <Link href="/pacientes/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {UI.patients.newPatient}
            </Button>
          </Link>
        }
      />

      <Suspense>
        <PatientSearch />
      </Suspense>

      <PatientTable patients={patients} therapists={therapists} />

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
