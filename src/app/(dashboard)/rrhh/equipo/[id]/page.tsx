import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getStaffMember } from "@/actions/staff";
import { StaffMemberDetail } from "@/components/rrhh/staff-member-detail";

export default async function StaffMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const { id } = await params;
  const member = await getStaffMember(id);
  if (!member) notFound();

  return (
    <div className="max-w-6xl mx-auto">
      <StaffMemberDetail member={member} />
    </div>
  );
}
