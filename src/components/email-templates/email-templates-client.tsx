"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Eye,
  Save,
  RotateCcw,
  Mail,
  Shield,
  Calendar,
  CreditCard,
  ClipboardList,
  Settings,
  Loader2,
} from "lucide-react";
import {
  updateEmailTemplate,
  resetEmailTemplate,
  previewEmailTemplate,
} from "@/actions/email-templates";
import type { TemplateCategory, TemplateId } from "@/lib/email-templates";
import { CATEGORY_LABELS } from "@/lib/email-templates";

interface TemplateData {
  id: TemplateId;
  label: string;
  description: string;
  category: TemplateCategory;
  variables: string[];
  defaultSubject: string;
  hasSubjectOverride: boolean;
  hasBodyOverride: boolean;
  currentSubject: string;
  currentBody: string | null;
}

interface Props {
  templates: TemplateData[];
}

const categoryIcons: Record<TemplateCategory, React.ElementType> = {
  auth: Shield,
  appointments: Calendar,
  payments: CreditCard,
  treatment: ClipboardList,
  system: Settings,
};

const categories: TemplateCategory[] = ["auth", "appointments", "payments", "treatment", "system"];

export function EmailTemplatesClient({ templates }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const openEditor = (tpl: TemplateData) => {
    setSelectedTemplate(tpl);
    setEditSubject(tpl.currentSubject);
    setEditBody(tpl.currentBody || "");
  };

  const closeEditor = () => {
    setSelectedTemplate(null);
    setEditSubject("");
    setEditBody("");
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    startTransition(async () => {
      const data: { subject?: string; body?: string } = {};
      if (editSubject !== selectedTemplate.defaultSubject) {
        data.subject = editSubject;
      }
      if (editBody && editBody.trim()) {
        data.body = editBody;
      }

      if (!data.subject && !data.body) {
        toast.info("No hay cambios para guardar.");
        return;
      }

      const result = await updateEmailTemplate(selectedTemplate.id, data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Plantilla actualizada correctamente.");
        closeEditor();
      }
    });
  };

  const handleReset = () => {
    if (!selectedTemplate) return;
    startTransition(async () => {
      const result = await resetEmailTemplate(selectedTemplate.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Plantilla restablecida a valores predeterminados.");
        closeEditor();
      }
    });
  };

  const handlePreview = () => {
    if (!selectedTemplate) return;
    startTransition(async () => {
      const result = await previewEmailTemplate(selectedTemplate.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setPreviewHtml(result.html);
        setPreviewSubject(result.subject);
        setIsPreviewOpen(true);
      }
    });
  };

  const insertVariable = (variable: string) => {
    const tag = `{{${variable}}}`;
    setEditBody((prev) => prev + tag);
  };

  return (
    <>
      <Tabs defaultValue="auth" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat];
            const count = templates.filter((t) => t.category === cat).length;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {CATEGORY_LABELS[cat]}
                <span className="text-xs text-muted-foreground ml-0.5">({count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="space-y-3">
            {templates
              .filter((t) => t.category === cat)
              .map((tpl) => {
                const isCustomized = tpl.hasSubjectOverride || tpl.hasBodyOverride;
                return (
                  <Card
                    key={tpl.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openEditor(tpl)}
                  >
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-rasma-teal/10 flex items-center justify-center shrink-0">
                          <Mail className="h-5 w-5 text-rasma-teal" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-rasma-dark text-sm truncate">
                            {tpl.label}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {tpl.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={isCustomized ? "default" : "secondary"}
                        className={isCustomized ? "bg-rasma-teal text-white shrink-0" : "shrink-0"}
                      >
                        {isCustomized ? "Personalizado" : "Predeterminado"}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Sheet */}
      <Sheet open={!!selectedTemplate} onOpenChange={(open) => !open && closeEditor()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-rasma-dark">
              {selectedTemplate?.label}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {selectedTemplate?.description}
            </p>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto del correo</Label>
              <Input
                id="subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="Asunto del email..."
              />
              {selectedTemplate?.defaultSubject !== editSubject && (
                <p className="text-xs text-muted-foreground">
                  Original: {selectedTemplate?.defaultSubject}
                </p>
              )}
            </div>

            {/* Variables */}
            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div className="space-y-2">
                <Label>Variables disponibles</Label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplate.variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-xs font-mono text-rasma-dark hover:bg-rasma-teal/10 hover:text-rasma-teal transition-colors cursor-pointer"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Haga clic en una variable para insertarla en el cuerpo.
                </p>
              </div>
            )}

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">Cuerpo del correo (HTML interno)</Label>
              <Textarea
                id="body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="El contenido HTML que se muestra dentro del marco del email..."
                className="min-h-[250px] font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                El encabezado (logo + título) y pie de página se mantienen automáticamente.
                Solo edite el contenido interno del correo.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={handlePreview}
                variant="outline"
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Vista previa
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="gap-1.5 bg-rasma-dark hover:bg-rasma-dark/90"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </Button>
              {(selectedTemplate?.hasSubjectOverride || selectedTemplate?.hasBodyOverride) && (
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  disabled={isPending}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restablecer
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-rasma-dark text-sm">
              Vista previa: {previewSubject}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded border bg-white">
            {previewHtml && (
              <iframe
                srcDoc={previewHtml}
                sandbox=""
                className="w-full h-[600px]"
                title="Vista previa de email"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
