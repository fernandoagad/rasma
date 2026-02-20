import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getInterns } from "@/actions/interns";
import { InternList } from "@/components/rrhh/intern-list";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { UserPlus } from "lucide-react";

export default async function PasantiasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; supervisor?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const params = await searchParams;
  const interns = await getInterns({
    status: params.status,
    search: params.search,
    supervisorId: params.supervisor,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <PageHeader title="Pasantías" subtitle="Programa de pasantías universitarias" />
        <Link href="/rrhh/postulantes?position=Pasantía+Universitaria">
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            Nuevo pasante
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex items-center gap-3">
          <Select name="status" defaultValue={params.status || "all"}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
              <SelectItem value="suspendido">Suspendido</SelectItem>
            </SelectContent>
          </Select>
        </form>
        <SearchInput basePath="/rrhh/pasantias" />
      </div>

      <InternList interns={interns} />
    </div>
  );
}
