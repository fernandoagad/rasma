import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getApplicants } from "@/actions/applicants";
import { ApplicantList } from "@/components/applicants/applicant-list";
import { PageHeader } from "@/components/ui/page-header";

export default async function PostulantesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; position?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const params = await searchParams;
  const applicants = await getApplicants({
    status: params.status,
    search: params.search,
    position: params.position,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Postulantes" subtitle="Gestionar postulaciones y candidatos" />
      <ApplicantList applicants={applicants} />
    </div>
  );
}
