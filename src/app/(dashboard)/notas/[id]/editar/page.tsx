import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionNoteById } from "@/actions/notes";
import { NoteEditForm } from "@/components/notes/note-edit-form";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "recepcionista") redirect("/");

  const { id } = await params;
  const note = await getSessionNoteById(id);

  const canEdit = session.user.role === "admin" || note.therapistId === session.user.id;
  if (!canEdit) redirect(`/notas/${id}`);

  const patientName = `${note.appointment.patient.firstName} ${note.appointment.patient.lastName}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={`/notas/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a nota
      </Link>

      <PageHeader
        title="Editar Nota Clinica"
        subtitle={`Paciente: ${patientName}`}
      />

      <NoteEditForm noteId={id} content={note.content} />
    </div>
  );
}
