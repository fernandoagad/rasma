import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCompletedAppointmentsWithoutNotes } from "@/actions/notes";
import { NoteForm } from "@/components/notes/note-form";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NuevaNota({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "recepcionista") redirect("/");

  const params = await searchParams;
  const pendingAppointments = await getCompletedAppointmentsWithoutNotes();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/notas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a notas
      </Link>

      <PageHeader
        title="Nueva Nota Clinica"
        subtitle="Documente la sesion utilizando el formato SOAP. La informacion se encripta automaticamente."
      />

      <NoteForm
        appointments={pendingAppointments}
        preselectedId={params.appointmentId}
      />
    </div>
  );
}
