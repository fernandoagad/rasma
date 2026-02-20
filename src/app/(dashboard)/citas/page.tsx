import { getAppointments, getTherapists } from "@/actions/appointments";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Suspense } from "react";
import { AppointmentsList } from "@/components/appointments/appointments-list";

export default async function CitasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; therapistId?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [{ appointments, total, totalPages, currentPage }, therapists] = await Promise.all([
    getAppointments({
      status: params.status,
      therapistId: params.therapistId,
      page,
    }),
    session.user.role !== "terapeuta" ? getTherapists() : Promise.resolve([]),
  ]);

  const filters = [
    {
      key: "status",
      label: "Estado",
      options: [
        { value: "all", label: "Todas" },
        { value: "programada", label: "Programadas" },
        { value: "completada", label: "Completadas" },
        { value: "cancelada", label: "Canceladas" },
        { value: "no_asistio", label: "No asistio" },
      ],
    },
    ...(therapists.length > 0
      ? [
          {
            key: "therapistId",
            label: "Terapeuta",
            options: [
              { value: "all", label: "Todos" },
              ...therapists.map((t) => ({ value: t.id, label: t.name })),
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Citas"
        subtitle={`${total} citas en total`}
        action={
          <Link href="/citas/nueva">
            <Button className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cita
            </Button>
          </Link>
        }
      />

      <Suspense>
        <FilterBar filters={filters} basePath="/citas" />
      </Suspense>

      {appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No hay citas registradas"
          description="Cree una nueva cita para comenzar."
        />
      ) : (
        <AppointmentsList
          appointments={appointments}
          totalPages={totalPages}
          currentPage={currentPage}
          filterStatus={params.status}
        />
      )}
    </div>
  );
}
