import { getAppointmentById, getRecurringGroupAppointments } from "@/actions/appointments";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Video,
  FileText,
  CreditCard,
  ArrowLeft,
  ExternalLink,
  Users,
  Repeat,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { AppointmentStatusButtons } from "@/components/appointments/appointment-status-buttons";
import { RecurringSeriesCard } from "@/components/appointments/recurring-series-card";

export default async function CitaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const appointment = await getAppointmentById(id);
  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
  const dt = new Date(appointment.dateTime);
  const endTime = new Date(dt.getTime() + appointment.durationMinutes * 60000);

  const sessionTypeLabels: Record<string, string> = {
    individual: "Individual",
    pareja: "Pareja",
    familiar: "Familiar",
    grupal: "Grupal",
    evaluacion: "Evaluacion",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/citas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a citas
      </Link>

      {/* Header Card */}
      <Card>
        <CardContent>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <AvatarInitials name={patientName} size="lg" />
              <div>
                <h1 className="text-xl font-bold text-rasma-dark">{patientName}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  RUT: {appointment.patient.rut || "\u2014"}
                </p>
                {appointment.patient.email && (
                  <p className="text-xs text-muted-foreground mt-0.5">{appointment.patient.email}</p>
                )}
              </div>
            </div>
            <StatusBadge type="appointment" status={appointment.status} />
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Fecha</p>
                <p className="text-sm font-semibold capitalize mt-0.5">
                  {dt.toLocaleDateString("es-CL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-100 text-purple-600 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Horario</p>
                <p className="text-sm font-semibold mt-0.5">
                  {dt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  {" \u2013 "}
                  {endTime.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  <span className="text-muted-foreground font-normal ml-1">({appointment.durationMinutes} min)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100 text-green-600 shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Terapeuta</p>
                <p className="text-sm font-semibold mt-0.5">{appointment.therapist.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-orange-100 text-orange-600 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Tipo de sesion</p>
                <p className="text-sm font-semibold mt-0.5">{sessionTypeLabels[appointment.sessionType] || appointment.sessionType}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modality Card */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center h-11 w-11 rounded-full shrink-0 ${
                appointment.modality === "online"
                  ? "bg-rasma-teal/15 text-rasma-teal"
                  : "bg-rasma-green/15 text-rasma-green"
              }`}>
                {appointment.modality === "online" ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <MapPin className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {appointment.modality === "online" ? "Sesion Online" : "Sesion Presencial"}
                </p>
                {appointment.location && (
                  <p className="text-xs text-muted-foreground mt-0.5">{appointment.location}</p>
                )}
                {appointment.modality === "online" && !appointment.meetingLink && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    No se genero el link de reunion. Verifique que el terapeuta tenga Google Calendar conectado.
                  </p>
                )}
              </div>
            </div>

            {appointment.meetingLink && (
              <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button className="gap-2 bg-rasma-teal text-white hover:bg-rasma-teal/90">
                  <Video className="h-4 w-4" />
                  Unirse a Google Meet
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {appointment.notes && (
        <Card>
          <CardContent>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Notas</p>
            <p className="text-sm leading-relaxed bg-muted/40 rounded-lg p-3.5 border">{appointment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Recurring series info */}
      {appointment.recurringGroupId && (
        <RecurringSeriesCard groupId={appointment.recurringGroupId} currentId={appointment.id} />
      )}

      {/* Note reminder banner */}
      {appointment.status === "completada" && !appointment.sessionNote && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-yellow-100">
                  <FileText className="h-5 w-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Nota clinica pendiente</p>
                  <p className="text-xs text-yellow-700">Esta cita fue completada pero no tiene nota clinica asociada.</p>
                </div>
              </div>
              <Link href={`/notas/nueva?appointmentId=${appointment.id}`}>
                <Button size="sm" className="bg-yellow-700 text-white hover:bg-yellow-800 gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Escribir nota
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status actions */}
      {appointment.status === "programada" && (
        <Card>
          <CardContent>
            <AppointmentStatusButtons appointmentId={appointment.id} />
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/pacientes/${appointment.patient.id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <User className="h-4 w-4" /> Ver ficha paciente
          </Button>
        </Link>
        {!appointment.sessionNote && appointment.status === "completada" && (
          <Link href={`/notas/nueva?appointmentId=${appointment.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="h-4 w-4" /> Agregar nota clinica
            </Button>
          </Link>
        )}
        {!appointment.payment && (
          <Link href={`/pagos?appointmentId=${appointment.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CreditCard className="h-4 w-4" /> Registrar pago
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
