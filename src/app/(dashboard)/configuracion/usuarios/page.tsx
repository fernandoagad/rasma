import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUsers } from "@/actions/users";
import { UserManagement } from "@/components/users/user-management";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { UI } from "@/constants/ui";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  const params = await searchParams;
  const userList = await getUsers({ area: params.area, status: params.status });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={UI.professionals.title}
        subtitle={UI.professionals.subtitle}
      />

      <FilterBar
        filters={[
          {
            key: "area",
            label: "Área",
            options: [
              { value: "all", label: "Todas" },
              { value: "Clínica", label: "Clínica" },
              { value: "Salud Mental", label: "Salud Mental" },
              { value: "Atención Directa", label: "Atención Directa" },
              { value: "Neurodesarrollo", label: "Neurodesarrollo" },
              { value: "Lenguaje", label: "Lenguaje" },
              { value: "Product", label: "Product" },
            ],
          },
          {
            key: "status",
            label: "Estado",
            options: [
              { value: "all", label: "Todos" },
              { value: "evaluando", label: "Evaluando" },
              { value: "disponible", label: "Disponible" },
              { value: "completo", label: "Completo" },
            ],
          },
        ]}
      />

      <UserManagement users={userList} />
    </div>
  );
}
