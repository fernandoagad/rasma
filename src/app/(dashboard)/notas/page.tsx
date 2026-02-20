import { getSessionNotes, getCompletedAppointmentsWithoutNotes } from "@/actions/notes";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Calendar, AlertTriangle, Plus, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "recepcionista") redirect("/");

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [{ notes, total, totalPages, currentPage }, pendingAppointments] = await Promise.all([
    getSessionNotes({ page }),
    getCompletedAppointmentsWithoutNotes(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Notas Clinicas"
        subtitle={`${total} notas · Formato SOAP encriptado`}
        action={
          <Link href="/notas/nueva">
            <Button className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Nota
            </Button>
          </Link>
        }
      />

      {/* Pending notes banner */}
      {pendingAppointments.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-yellow-100 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-yellow-900">
                    {pendingAppointments.length} cita{pendingAppointments.length !== 1 ? "s" : ""} completada{pendingAppointments.length !== 1 ? "s" : ""} sin nota
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {pendingAppointments.slice(0, 3).map((a) => (
                      <Link
                        key={a.id}
                        href={`/notas/nueva?appointmentId=${a.id}`}
                        className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full hover:bg-yellow-200 transition-colors"
                      >
                        {a.patient.firstName} {a.patient.lastName}
                        <span className="text-yellow-600">\u2192</span>
                      </Link>
                    ))}
                    {pendingAppointments.length > 3 && (
                      <span className="text-xs text-yellow-700">+{pendingAppointments.length - 3} mas</span>
                    )}
                  </div>
                </div>
              </div>
              <Link href="/notas/nueva">
                <Button size="sm" className="bg-yellow-700 text-white hover:bg-yellow-800 shrink-0">
                  Escribir nota
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay notas clinicas"
          description="Las notas se crean despues de completar una cita."
        />
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const patientName = `${note.appointment.patient.firstName} ${note.appointment.patient.lastName}`;
            return (
              <Link key={note.id} href={`/notas/${note.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4 flex items-center gap-4">
                    <AvatarInitials name={patientName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{patientName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(note.appointment.dateTime).toLocaleDateString("es-CL", {
                          weekday: "short", day: "numeric", month: "short"
                        })}
                        <span>\u00B7</span>
                        {note.therapist.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200">
                        <Shield className="h-2.5 w-2.5" /> Encriptado
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.createdAt).toLocaleDateString("es-CL")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/notas?page=${p}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                p === currentPage ? "bg-rasma-dark text-rasma-lime" : "bg-muted hover:bg-muted/80"
              }`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
