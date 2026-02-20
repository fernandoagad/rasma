"use client";

import { useActionState } from "react";
import { updateSessionNote } from "@/actions/notes";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Loader2, Stethoscope, Eye, Brain, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  noteId: string;
  content: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

const SOAP_SECTIONS = [
  {
    key: "subjective",
    label: "Subjetivo (S)",
    icon: Stethoscope,
    placeholder: "Lo que el paciente reporta...",
    description: "Relato del paciente en sus propias palabras",
    color: "blue",
  },
  {
    key: "objective",
    label: "Objetivo (O)",
    icon: Eye,
    placeholder: "Observaciones clinicas...",
    description: "Observaciones directas del terapeuta",
    color: "green",
  },
  {
    key: "assessment",
    label: "Evaluacion (A)",
    icon: Brain,
    placeholder: "Analisis clinico...",
    description: "Analisis e interpretacion clinica",
    color: "purple",
  },
  {
    key: "plan",
    label: "Plan (P)",
    icon: ClipboardList,
    placeholder: "Proximos pasos...",
    description: "Plan de accion y proximos pasos",
    color: "orange",
  },
];

const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
  blue: { bg: "bg-blue-100", icon: "text-blue-600", border: "border-blue-200 focus-within:border-blue-400" },
  green: { bg: "bg-green-100", icon: "text-green-600", border: "border-green-200 focus-within:border-green-400" },
  purple: { bg: "bg-purple-100", icon: "text-purple-600", border: "border-purple-200 focus-within:border-purple-400" },
  orange: { bg: "bg-orange-100", icon: "text-orange-600", border: "border-orange-200 focus-within:border-orange-400" },
};

export function NoteEditForm({ noteId, content }: Props) {
  const boundUpdate = useCallback(
    (prev: { error?: string; success?: boolean } | undefined, formData: FormData) =>
      updateSessionNote(noteId, prev, formData),
    [noteId]
  );
  const [state, action, pending] = useActionState(boundUpdate, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      toast.success("Nota actualizada");
      router.push(`/notas/${noteId}`);
    }
  }, [state?.success, router, noteId]);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-1.5 mb-5">
            <Shield className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xs text-muted-foreground">Contenido encriptado AES-256-GCM</p>
          </div>

          <div className="space-y-4">
            {SOAP_SECTIONS.map((section) => {
              const colors = colorClasses[section.color];
              return (
                <div key={section.key} className={cn("rounded-xl border p-4 transition-colors", colors.border)}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("flex items-center justify-center h-7 w-7 rounded-lg", colors.bg)}>
                      <section.icon className={cn("h-4 w-4", colors.icon)} />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">{section.label}</Label>
                      <p className="text-[10px] text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <Textarea
                    name={section.key}
                    rows={4}
                    defaultValue={content[section.key as keyof typeof content] || ""}
                    placeholder={section.placeholder}
                    className="resize-none border-0 bg-muted/30 p-3 focus-visible:ring-0 shadow-none text-sm placeholder:text-muted-foreground/40"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="flex-1 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Guardar cambios
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
