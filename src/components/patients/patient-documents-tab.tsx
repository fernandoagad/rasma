"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  ExternalLink,
  Trash2,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { deletePatientFile } from "@/actions/patient-files";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface PatientFile {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  category: string;
  driveViewLink: string | null;
  driveDownloadLink: string | null;
  uploadedBy: string;
  createdAt: Date;
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return FileSpreadsheet;
  return File;
}

function getFileColor(mimeType: string) {
  if (mimeType === "application/pdf") return "text-red-500";
  if (mimeType.startsWith("image/")) return "text-blue-500";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "text-green-600";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "text-blue-600";
  return "text-muted-foreground";
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(raw: Date): string {
  const d = new Date(raw);
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PatientDocumentsTab({
  patientId,
  files,
  canManage,
}: {
  patientId: string;
  files: PatientFile[];
  canManage: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PatientFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`/api/patients/${patientId}/files`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok) {
          toast.success("Archivo subido exitosamente");
          router.refresh();
        } else {
          const errorMsg = data.error || "Error al subir archivo";
          if (errorMsg.includes("credenciales de Google") || errorMsg.includes("Google")) {
            toast.error("Para subir archivos, primero conecte su cuenta de Google desde Configuracion.");
          } else {
            toast.error(errorMsg);
          }
        }
      } catch {
        toast.error("Error de conexión al subir archivo");
      }
      setUploading(false);
    },
    [patientId, router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      e.target.value = "";
    },
    [handleUpload]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deletePatientFile(deleteTarget.id, patientId);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Archivo eliminado");
      router.refresh();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      {canManage && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "relative rounded-xl border-2 border-dashed p-6 text-center transition-colors",
            dragOver
              ? "border-rasma-teal bg-rasma-teal/5"
              : "border-muted-foreground/20 hover:border-muted-foreground/40"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-rasma-teal" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground/50" />
            )}
            <p className="text-sm text-muted-foreground">
              {uploading
                ? "Subiendo archivo..."
                : "Arrastre un archivo aquí o"}
            </p>
            {!uploading && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Seleccionar archivo
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground/60">
              PDF, Word, Excel, PowerPoint, imágenes. Máx 25MB.
            </p>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Sin documentos"
          description="Este paciente no tiene documentos adjuntos."
        />
      ) : (
        <Card className="py-0 gap-0 overflow-hidden">
          <div className="divide-y">
            {files.map((file) => {
              const Icon = getFileIcon(file.mimeType);
              const color = getFileColor(file.mimeType);
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted",
                      color
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {file.fileName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {file.uploadedBy} · {formatDate(file.createdAt)}
                      {file.fileSize ? ` · ${formatFileSize(file.fileSize)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {file.driveViewLink && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a
                          href={file.driveViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver en Google Drive"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => setDeleteTarget(file)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar archivo</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar &quot;{deleteTarget?.fileName}&quot;?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
