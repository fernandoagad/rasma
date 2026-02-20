import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyAppointments, getMyProfessionals } from "@/actions/patient-portal";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users2,
  ExternalLink,
} from "lucide-react";
import { CancelAppointmentButton } from "./cancel-button";

const statusVariant: Record<string, "info" | "success" | "destructive" | "warning"> = {
  programada: "info",
  completada: "success",
  cancelada: "destructive",
  no_asistio: "warning",
};

const statusLabel: Record<string, string> = {
  programada: "Programada",
  completada: "Completada",
  cancelada: "Cancelada",
  no_asistio: "No asistió",
};

function formatDateSpanish(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function MisCitasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "paciente") redirect("/");

  const [appointments, professionals] = await Promise.all([
    getMyAppointments(),
    getMyProfessionals(),
  ]);

  // Serialize dates for client components
  const serializedAppointments = appointments.map((apt) => ({
    ...apt,
    dateTime: apt.dateTime.toISOString(),
    createdAt: apt.createdAt.toISOString(),
    updatedAt: apt.updatedAt.toISOString(),
  }));

  const now = new Date();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Bienvenido/a, ${session.user.name?.split(" ")[0] || "Paciente"}`}
        subtitle="Aquí puedes ver tus citas, profesionales asignados y gestionar tus sesiones."
      />

      {/* Professionals section */}
      {professionals.length > 0 && (
        <ProfessionalsSection professionals={professionals} />
      )}

      {/* Appointments section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Mis Citas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {serializedAppointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No tienes citas registradas"
              description="Cuando tengas citas programadas, aparecerán aquí."
            />
          ) : (
            <div className="divide-y">
              {serializedAppointments.map((apt) => {
                const dateTime = new Date(apt.dateTime);
                const isFuture = dateTime > now;
                const isWithin2Hours =
                  dateTime.getTime() - now.getTime() <= 2 * 60 * 60 * 1000 &&
                  dateTime.getTime() > now.getTime();
                const showMeetingLink =
                  apt.modality === "online" &&
                  apt.status === "programada" &&
                  isWithin2Hours &&
                  apt.meetingLink;
                const showCancel =
                  apt.status === "programada" && isFuture;

                return (
                  <div
                    key={apt.id}
                    className="py-4 first:pt-0 last:pb-0 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-rasma-dark capitalize">
                          {formatDateSpanish(dateTime)}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(dateTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            {apt.modality === "online" ? (
                              <Video className="h-3.5 w-3.5" />
                            ) : (
                              <MapPin className="h-3.5 w-3.5" />
                            )}
                            {apt.modality === "online"
                              ? "Online"
                              : "Presencial"}
                          </span>
                          <span>{apt.durationMinutes} min</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Profesional: {apt.therapist.name}
                          {apt.therapist.specialty &&
                            ` — ${apt.therapist.specialty}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={statusVariant[apt.status] ?? "outline"}>
                          {statusLabel[apt.status] ?? apt.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Meeting link */}
                    {showMeetingLink && (
                      <a
                        href={apt.meetingLink!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <Video className="h-4 w-4" />
                        Unirse a la videollamada
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    {/* Cancel button */}
                    {showCancel && (
                      <CancelAppointmentButton appointmentId={apt.id} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Professionals section ──────────────────────────── */

function ProfessionalsSection({
  professionals,
}: {
  professionals: Awaited<ReturnType<typeof getMyProfessionals>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Mis Profesionales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {professionals.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <AvatarInitials
                name={member.user.name}
                image={member.user.image}
                size="md"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-rasma-dark truncate">
                  {member.user.name}
                </p>
                {member.user.specialty && (
                  <p className="text-xs text-muted-foreground truncate">
                    {member.user.specialty}
                  </p>
                )}
                <p className="text-xs text-muted-foreground truncate">
                  {member.user.email}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
