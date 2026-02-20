import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getApplicantById } from "@/actions/applicants";
import { getStaffForSupervisorSelect } from "@/actions/interns";
import { hasGoogleCalendarAccess } from "@/lib/google-calendar";
import { db } from "@/lib/db";
import { interns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  // Check if this applicant has an intern profile
  const internRecord = await db.query.interns.findFirst({
    where: eq(interns.applicantId, id),
    columns: { id: true },
  });

  // Check if applicant applied for internship
  let isInternApplicant = false;
  try {
    const positions: string[] = JSON.parse(applicant.positions);
    isInternApplicant = positions.includes("Pasantía Universitaria");
  } catch { /* ignore */ }

  // Load staff list and calendar access only if needed
  const staffList = isInternApplicant && !internRecord ? await getStaffForSupervisorSelect() : [];
  const calendarAccess = isInternApplicant ? await hasGoogleCalendarAccess(session.user.id) : false;

  return (
    <div className="max-w-5xl mx-auto">
      <ApplicantDetail
        applicant={applicant}
        isAdmin={session.user.role === "admin"}
        internId={internRecord?.id}
        isInternApplicant={isInternApplicant}
        staffList={staffList}
        hasCalendarAccess={calendarAccess}
      />
    </div>
  );
}
