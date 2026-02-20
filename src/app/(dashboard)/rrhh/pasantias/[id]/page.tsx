import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getInternById, getInternHoursSummary } from "@/actions/interns";
import { InternDetail } from "@/components/rrhh/intern-detail";

export default async function InternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const { id } = await params;
  const intern = await getInternById(id);
  if (!intern) notFound();

  const hoursSummary = await getInternHoursSummary(id);

  return (
    <div className="max-w-5xl mx-auto">
      <InternDetail intern={intern} hoursSummary={hoursSummary} />
    </div>
  );
}
