"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const EMAIL_TEMPLATES = [
  {
    label: "Resolución",
    subject: "Resultado de tu postulación — Fundación RASMA",
    body: `Queremos informarte sobre el resultado de tu postulación a Fundación RASMA.\n\nDespués de revisar cuidadosamente tu perfil, hemos tomado una decisión respecto a tu candidatura.\n\nAgradecemos tu interés en ser parte de nuestro equipo.`,
  },
  {
    label: "Seguimiento",
    subject: "Seguimiento de tu postulación — Fundación RASMA",
    body: `Queremos darte un seguimiento sobre tu postulación a Fundación RASMA.\n\nTu perfil se encuentra actualmente en revisión por nuestro equipo.\n\nTe contactaremos pronto con novedades.`,
  },
  {
    label: "Entrevista",
    subject: "Invitación a entrevista — Fundación RASMA",
    body: `Nos complace informarte que tu perfil ha avanzado en nuestro proceso de selección.\n\nQuisiéramos agendar una entrevista contigo para conocerte mejor.\n\nPor favor, indícanos tu disponibilidad para coordinar una reunión.`,
  },
];

export function ApplicantEmailDialog({
  open,
  onOpenChange,
  applicantName,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName: string;
  onSend: (subject: string, body: string) => Promise<void>;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(template: (typeof EMAIL_TEMPLATES)[number]) {
    setSubject(template.subject);
    setBody(template.body);
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      setError("Complete el asunto y el mensaje.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onSend(subject, body);
      setSubject("");
      setBody("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar correo a {applicantName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Templates */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Plantilla rápida</Label>
            <div className="flex flex-wrap gap-2">
              {EMAIL_TEMPLATES.map((tpl) => (
                <Button
                  key={tpl.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(tpl)}
                  className="text-xs"
                >
                  {tpl.label}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email-subject">Asunto</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-body">Mensaje</Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escriba el mensaje..."
              className="min-h-[160px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar correo"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
