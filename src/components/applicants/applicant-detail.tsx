"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  updateApplicantStatus,
  addApplicantNote,
  deleteApplicant,
  sendApplicantEmailAction,
} from "@/actions/applicants";
import { ApplicantEmailDialog } from "./applicant-email-dialog";
import { UI } from "@/constants/ui";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  FileText,
  ExternalLink,
  Download,
  Send,
  Trash2,
  MessageSquare,
  GraduationCap,
  CalendarPlus,
} from "lucide-react";
import { InternCreateDialog } from "@/components/rrhh/intern-create-dialog";
import { InterviewScheduleDialog } from "@/components/rrhh/interview-schedule-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ApplicantFile {
  id: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  driveViewLink: string | null;
  driveDownloadLink: string | null;
  uploadedAt: Date;
}

interface ApplicantNote {
  id: string;
  content: string;
  type: string;
  createdAt: Date;
  authorName: string;
  authorImage: string | null;
}

interface ApplicantData {
  id: string;
  name: string;
  email: string;
  phone: string;
  positions: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  files: ApplicantFile[];
  notes: ApplicantNote[];
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  nuevo: "default",
  en_revision: "secondary",
  entrevista: "secondary",
  aceptado: "default",
  rechazado: "destructive",
  en_espera: "outline",
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  nota: "Nota",
  email_enviado: "Correo enviado",
  estado_cambiado: "Estado cambiado",
};

interface StaffOption {
  id: string;
  name: string;
  specialty: string | null;
  role: string;
}

export function ApplicantDetail({
  applicant,
  isAdmin,
  internId,
  isInternApplicant,
  staffList,
  hasCalendarAccess,
}: {
  applicant: ApplicantData;
  isAdmin: boolean;
  internId?: string;
  isInternApplicant?: boolean;
  staffList?: StaffOption[];
  hasCalendarAccess?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [noteContent, setNoteContent] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInternDialog, setShowInternDialog] = useState(false);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);

  let positions: string[] = [];
  try {
    positions = JSON.parse(applicant.positions);
  } catch { /* ignore */ }

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      await updateApplicantStatus(applicant.id, newStatus);
      router.refresh();
    });
  }

  function handleAddNote() {
    if (!noteContent.trim()) return;
    startTransition(async () => {
      await addApplicantNote(applicant.id, noteContent);
      setNoteContent("");
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteApplicant(applicant.id);
      router.push("/rrhh/postulantes");
    });
  }

  async function handleSendEmail(subject: string, body: string) {
    const result = await sendApplicantEmailAction(applicant.id, subject, body);
    if (result.error) {
      throw new Error(result.error);
    }
    router.refresh();
  }

  const statusLabel = UI.rrhh.statuses[applicant.status] || applicant.status;
  const statusVariant = STATUS_VARIANTS[applicant.status] || "outline";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/rrhh/postulantes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-rasma-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a postulantes
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-rasma-dark">{applicant.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Postulación del {applicant.createdAt.toLocaleDateString("es-CL", { dateStyle: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Intern-specific actions */}
          {isInternApplicant && internId && (
            <Link href={`/rrhh/pasantias/${internId}`}>
              <Button variant="outline" size="sm">
                <GraduationCap className="h-4 w-4 mr-1" />
                Ver pasantía
              </Button>
            </Link>
          )}
          {isInternApplicant && !internId && applicant.status === "aceptado" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInternDialog(true)}
            >
              <GraduationCap className="h-4 w-4 mr-1" />
              Crear pasantía
            </Button>
          )}
          {isInternApplicant && !internId && (applicant.status === "entrevista" || applicant.status === "en_revision") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInterviewDialog(true)}
            >
              <CalendarPlus className="h-4 w-4 mr-1" />
              Programar entrevista
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailDialog(true)}
          >
            <Send className="h-4 w-4 mr-1" />
            Enviar correo
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Info + Files */}
        <div className="lg:col-span-1 space-y-4">
          {/* Info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${applicant.email}`} className="text-rasma-teal hover:underline truncate">
                  {applicant.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{applicant.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{applicant.createdAt.toLocaleDateString("es-CL")}</span>
              </div>

              {/* Status */}
              <div className="pt-2 border-t space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <Select value={applicant.status} onValueChange={handleStatusChange} disabled={isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UI.rrhh.statuses).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Positions */}
              <div className="pt-2 border-t space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Puestos de interés</label>
                <div className="flex flex-wrap gap-1">
                  {positions.map((pos) => (
                    <Badge key={pos} variant="outline" className="text-xs font-normal">{pos}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Archivos</CardTitle>
            </CardHeader>
            <CardContent>
              {applicant.files.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin archivos adjuntos.</p>
              ) : (
                <div className="space-y-2">
                  {applicant.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 p-2 rounded-lg border text-sm"
                    >
                      <FileText className="h-4 w-4 text-rasma-teal shrink-0" />
                      <span className="truncate flex-1">{file.fileName}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {file.driveViewLink && (
                          <a
                            href={file.driveViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-accent rounded"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {file.driveDownloadLink && (
                          <a
                            href={file.driveDownloadLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-accent rounded"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Notes timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notas y actividad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add note form */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Agregar una nota..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!noteContent.trim() || isPending}
              >
                {UI.rrhh.addNote}
              </Button>

              {/* Notes timeline */}
              {applicant.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sin notas registradas.
                </p>
              ) : (
                <div className="space-y-4 pt-4 border-t">
                  {applicant.notes.map((note) => {
                    const initials = note.authorName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <div key={note.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          {note.authorImage && <AvatarImage src={note.authorImage} />}
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{note.authorName}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {NOTE_TYPE_LABELS[note.type] || note.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {note.createdAt.toLocaleDateString("es-CL")} {note.createdAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email dialog */}
      <ApplicantEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        applicantName={applicant.name}
        onSend={handleSendEmail}
      />

      {/* Delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar postulante</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al postulante {applicant.name} y todos sus archivos y notas asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Intern create dialog */}
      {isInternApplicant && !internId && staffList && (
        <InternCreateDialog
          open={showInternDialog}
          onOpenChange={setShowInternDialog}
          applicantId={applicant.id}
          applicantName={applicant.name}
          staffList={staffList}
        />
      )}

      {/* Interview schedule dialog */}
      {isInternApplicant && !internId && (
        <InterviewScheduleDialog
          open={showInterviewDialog}
          onOpenChange={setShowInterviewDialog}
          applicantId={applicant.id}
          applicantName={applicant.name}
          hasCalendarAccess={hasCalendarAccess ?? false}
        />
      )}
    </div>
  );
}
