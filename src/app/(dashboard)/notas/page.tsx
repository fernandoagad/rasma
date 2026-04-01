import { getSessionNotes, getCompletedAppointmentsWithoutNotes } from "@/actions/notes";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Calendar, AlertTriangle, Plus, Shield, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rasma-dark text-rasma-lime flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-rasma-dark tracking-tight">Notas Clinicas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total} notas
              <span className="inline-flex items-center gap-1 ml-2 text-xs bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                <Shield className="h-2.5 w-2.5" /> SOAP encriptado
              </span>
            </p>
          </div>
        </div>
        <Link href="/notas/nueva">
          <Button className="h-11 px-5 text-base font-semibold rounded-xl gap-2 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90">
            <Plus className="h-5 w-5" />
            Nueva Nota
          </Button>
        </Link>
      </div>

      {/* ═══ PENDING BANNER ═══ */}
      {pendingAppointments.length > 0 && (
        <div className="rounded-2xl border border-rasma-dark/15 bg-rasma-dark/[0.03] p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rasma-dark text-rasma-lime flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-rasma-dark">
                  {pendingAppointments.length} cita{pendingAppointments.length !== 1 ? "s" : ""} sin nota
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {pendingAppointments.slice(0, 3).map((a) => (
                    <Link
                      key={a.id}
                      href={`/notas/nueva?appointmentId=${a.id}`}
                      className="inline-flex items-center gap-1.5 text-xs bg-white text-rasma-dark px-2.5 py-1 rounded-lg border hover:bg-zinc-50 transition-colors font-medium"
                    >
                      {a.patient.firstName} {a.patient.lastName}
                      <ArrowRight className="h-3 w-3 opacity-40" />
                    </Link>
                  ))}
                  {pendingAppointments.length > 3 && (
                    <span className="text-xs text-muted-foreground self-center">+{pendingAppointments.length - 3} mas</span>
                  )}
                </div>
              </div>
            </div>
            <Link href="/notas/nueva">
              <Button size="sm" className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 rounded-xl shrink-0">
                Escribir nota
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ═══ NOTES LIST ═══ */}
      {notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay notas clinicas"
          description="Las notas se crean despues de completar una cita."
        />
      ) : (
        <div className="space-y-2.5">
          {notes.map((note) => {
            const patientName = `${note.appointment.patient.firstName} ${note.appointment.patient.lastName}`;
            return (
              <Link key={note.id} href={`/notas/${note.id}`}>
                <Card className="hover:shadow-md transition-all rounded-2xl hover:-translate-y-0.5">
                  <CardContent className="py-4 px-5 flex items-center gap-4">
                    <AvatarInitials name={patientName} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base text-rasma-dark">{patientName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {new Date(note.appointment.dateTime).toLocaleDateString("es-CL", {
                          timeZone: "America/Santiago", weekday: "short", day: "numeric", month: "short"
                        })}
                        <span className="opacity-40">\u00B7</span>
                        {note.therapist.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:flex items-center gap-1.5 text-xs text-rasma-dark bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200 font-medium">
                        <Shield className="h-3 w-3" /> Encriptado
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {new Date(note.createdAt).toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* ═══ PAGINATION ═══ */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 pt-4">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) pageNum = i + 1;
            else if (currentPage <= 4) pageNum = i + 1;
            else if (currentPage >= totalPages - 3) pageNum = totalPages - 6 + i;
            else pageNum = currentPage - 3 + i;
            return (
              <Link
                key={pageNum}
                href={`/notas?page=${pageNum}`}
                className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                  pageNum === currentPage
                    ? "bg-rasma-dark text-rasma-lime"
                    : "text-muted-foreground hover:bg-zinc-100"
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
