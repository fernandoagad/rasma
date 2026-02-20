import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getApplicantById } from "@/actions/applicants";
import { ApplicantDetail } from "@/components/applicants/applicant-detail";

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const { id } = await params;
  const applicant = await getApplicantById(id);
  if (!applicant) notFound();

  return (
    <div className="max-w-5xl mx-auto">
      <ApplicantDetail applicant={applicant} isAdmin={session.user.role === "admin"} />
    </div>
  );
}
