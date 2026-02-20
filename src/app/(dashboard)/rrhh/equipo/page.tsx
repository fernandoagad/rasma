import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTeamOverview } from "@/actions/rrhh";
import { TeamOverview } from "@/components/rrhh/team-overview";
import { PageHeader } from "@/components/ui/page-header";

export default async function EquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; area?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const params = await searchParams;
  const team = await getTeamOverview(params);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Equipo" subtitle={`${team.length} profesionales`} />
      <TeamOverview team={team} />
    </div>
  );
}
