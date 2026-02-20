import { getSessionNoteById } from "@/actions/notes";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Shield, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteDeleteButton } from "@/components/notes/note-delete-button";

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "recepcionista") redirect("/");

  const { id } = await params;
  const note = await getSessionNoteById(id);

  const canEdit = session.user.role === "admin" || note.therapistId === session.user.id;

  const sections = [
    { key: "subjective", label: "Subjetivo", description: "Lo que el paciente reporta" },
    { key: "objective", label: "Objetivo", description: "Observaciones del terapeuta" },
    { key: "assessment", label: "Evaluacion", description: "Analisis clinico" },
    { key: "plan", label: "Plan", description: "Proximos pasos y tratamiento" },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/notas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-rasma-dark">
        <ArrowLeft className="h-4 w-4" /> Volver a notas
      </Link>

      <div className="bg-white border rounded-xl p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-rasma-dark flex items-center gap-2">
              <User className="h-5 w-5" />
              {note.appointment.patient.firstName} {note.appointment.patient.lastName}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(note.appointment.dateTime).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span>Terapeuta: {note.therapist.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
              <Shield className="h-3 w-3" /> Encriptado
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.key} className="border rounded-lg p-4">
              <h3 className="font-semibold text-rasma-dark text-sm mb-0.5">{s.label}</h3>
              <p className="text-xs text-muted-foreground mb-2">{s.description}</p>
              <p className="text-sm whitespace-pre-wrap">
                {note.content[s.key] || <span className="text-muted-foreground italic">Sin informacion</span>}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Creada: {new Date(note.createdAt).toLocaleString("es-CL")}
          {note.updatedAt !== note.createdAt && ` · Actualizada: ${new Date(note.updatedAt).toLocaleString("es-CL")}`}
        </p>

        {/* Action buttons */}
        {canEdit && (
          <div className="flex items-center gap-3 pt-2 border-t">
            <Link href={`/notas/${id}/editar`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            </Link>
            <NoteDeleteButton noteId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
