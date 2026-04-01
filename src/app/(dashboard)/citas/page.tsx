import { getAppointments, getTherapists } from "@/actions/appointments";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const scheduledCount = appointments.filter((a) => a.status === "programada").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rasma-dark text-rasma-lime flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-rasma-dark tracking-tight">Citas</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {total} en total
                {scheduledCount > 0 && (
                  <> · <span className="font-medium text-rasma-dark">{scheduledCount} programada{scheduledCount !== 1 ? "s" : ""}</span></>
                )}
              </p>
            </div>
          </div>
        </div>

        <Link href="/citas/nueva">
          <Button className="h-11 px-5 text-base font-semibold rounded-xl gap-2 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
            <Plus className="h-5 w-5" />
            Nueva Cita
          </Button>
        </Link>
      </div>

      {/* ═══ FILTERS ═══ */}
      <Suspense>
        <FilterBar filters={filters} basePath="/citas" />
      </Suspense>

      {/* ═══ LIST ═══ */}
      {appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No hay citas registradas"
          description={params.status ? "No hay citas con este filtro. Intenta cambiar los filtros." : "Cree una nueva cita para comenzar."}
          action={
            !params.status ? (
              <Link href="/citas/nueva">
                <Button className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 gap-2">
                  <Plus className="h-4 w-4" /> Nueva Cita
                </Button>
              </Link>
            ) : undefined
          }
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
