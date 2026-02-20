"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Eye,
  X,
  Download,
  MoreVertical,
  Search,
  Tag,
  Pencil,
  CheckSquare,
} from "lucide-react";
import {
  deleteFoundationDocument,
  renameFoundationDocument,
  updateFoundationDocLabel,
  updateFoundationDocCategory,
  bulkUpdateFoundationDocLabel,
  bulkUpdateFoundationDocCategory,
} from "@/actions/foundation-documents";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { UI } from "@/constants/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FoundationDocument {
  id: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  category: string;
  label: string | null;
  driveViewLink: string | null;
  driveDownloadLink: string | null;
  uploadedBy: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Category styling
// ---------------------------------------------------------------------------

const CATEGORY_VARIANTS: Record<
  string,
  "secondary" | "info" | "warning" | "success"
> = {
  manual: "info",
  legal: "warning",
  politica: "success",
  reglamento: "info",
  certificado: "success",
  acta: "secondary",
  convenio: "warning",
  financiero: "info",
  otro: "secondary",
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

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

function canPreview(mimeType: string): boolean {
  return (
    mimeType === "application/pdf" ||
    mimeType.startsWith("image/") ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint")
  );
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FoundationDocuments({
  files,
}: {
  files: FoundationDocument[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("otro");

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Preview state
  const [previewFile, setPreviewFile] = useState<FoundationDocument | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<FoundationDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rename dialog state
  const [renameTarget, setRenameTarget] = useState<FoundationDocument | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Label dialog state
  const [labelTarget, setLabelTarget] = useState<FoundationDocument | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [updatingLabel, setUpdatingLabel] = useState(false);

  // Category dialog state
  const [categoryTarget, setCategoryTarget] = useState<FoundationDocument | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [updatingCategory, setUpdatingCategory] = useState(false);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived / filtered data
  // ---------------------------------------------------------------------------

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        file.fileName.toLowerCase().includes(query) ||
        (file.label && file.label.toLowerCase().includes(query));
      const matchesCategory =
        categoryFilter === "all" || file.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [files, searchQuery, categoryFilter]);

  const allFilteredSelected =
    filteredFiles.length > 0 &&
    filteredFiles.every((f) => selectedIds.has(f.id));

  // Category entries without "all"
  const categoryEntries = Object.entries(UI.foundationDocuments.categories).filter(
    ([key]) => key !== "all"
  );

  // ---------------------------------------------------------------------------
  // Handlers — Upload
  // ---------------------------------------------------------------------------

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", uploadCategory);

      try {
        const res = await fetch("/api/foundation-documents", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok) {
          toast.success("Archivo subido exitosamente");
          router.refresh();
        } else {
          toast.error(data.error || "Error al subir archivo");
        }
      } catch {
        toast.error("Error de conexión al subir archivo");
      }
      setUploading(false);
    },
    [uploadCategory, router]
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

  // ---------------------------------------------------------------------------
  // Handlers — Single operations
  // ---------------------------------------------------------------------------

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteFoundationDocument(deleteTarget.id);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Archivo eliminado");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      router.refresh();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    setRenaming(true);
    const result = await renameFoundationDocument(renameTarget.id, newFileName);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Archivo renombrado");
      router.refresh();
    }
    setRenaming(false);
    setRenameTarget(null);
  };

  const handleLabelUpdate = async () => {
    if (!labelTarget) return;
    setUpdatingLabel(true);
    const result = await updateFoundationDocLabel(labelTarget.id, newLabel || null);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Etiqueta actualizada");
      router.refresh();
    }
    setUpdatingLabel(false);
    setLabelTarget(null);
  };

  const handleCategoryUpdate = async () => {
    if (!categoryTarget || !newCategory) return;
    setUpdatingCategory(true);
    const result = await updateFoundationDocCategory(categoryTarget.id, newCategory);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Categoría actualizada");
      router.refresh();
    }
    setUpdatingCategory(false);
    setCategoryTarget(null);
  };

  // ---------------------------------------------------------------------------
  // Handlers — Bulk operations
  // ---------------------------------------------------------------------------

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkLabel = async (label: string | null) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkUpdating(true);
    const result = await bulkUpdateFoundationDocLabel(ids, label);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Etiqueta actualizada en ${ids.length} archivo(s)`);
      setSelectedIds(new Set());
      router.refresh();
    }
    setBulkUpdating(false);
  };

  const handleBulkCategory = async (category: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkUpdating(true);
    const result = await bulkUpdateFoundationDocCategory(ids, category);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Categoría actualizada en ${ids.length} archivo(s)`);
      setSelectedIds(new Set());
      router.refresh();
    }
    setBulkUpdating(false);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Upload zone with category selector */}
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
            {uploading ? "Subiendo archivo..." : "Arrastre un archivo aquí o"}
          </p>
          {!uploading && (
            <div className="flex items-center gap-2">
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryEntries.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Seleccionar archivo
              </Button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/60">
            PDF, Word, Excel, PowerPoint, imágenes. Máx 25MB.
          </p>
        </div>
      </div>

      {/* Search & filter bar */}
      {files.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o etiqueta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(UI.foundationDocuments.categories).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {selectedIds.size} seleccionados
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {/* Bulk label dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkUpdating}
                >
                  <Tag className="h-3.5 w-3.5 mr-1.5" />
                  Etiquetar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {UI.foundationDocuments.defaultLabels.map((label) => (
                  <DropdownMenuItem
                    key={label}
                    onClick={() => handleBulkLabel(label)}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleBulkLabel(null)}
                  className="text-muted-foreground"
                >
                  Quitar etiqueta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk category dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkUpdating}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Categoría
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {categoryEntries.map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => handleBulkCategory(value)}
                  >
                    <Badge
                      variant={CATEGORY_VARIANTS[value] || "secondary"}
                      className="text-[10px] px-1.5 py-0 mr-2"
                    >
                      {label}
                    </Badge>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Deseleccionar
            </Button>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Sin documentos"
          description="No hay documentos de la fundación. Suba el primer archivo."
        />
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="No se encontraron documentos con los filtros aplicados."
        />
      ) : (
        <Card className="py-0 gap-0 overflow-hidden">
          <div className="divide-y">
            {/* Select all header */}
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/30">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Seleccionar todos"
              />
              <span className="text-xs text-muted-foreground font-medium">
                Seleccionar todos ({filteredFiles.length})
              </span>
            </div>

            {filteredFiles.map((file) => {
              const Icon = getFileIcon(file.mimeType);
              const color = getFileColor(file.mimeType);
              const previewable = canPreview(file.mimeType);
              const categoryVariant =
                CATEGORY_VARIANTS[file.category] || "secondary";
              const categoryLabel =
                UI.foundationDocuments.categories[file.category] || file.category;
              const isSelected = selectedIds.has(file.id);

              return (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    previewable &&
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                    isSelected && "bg-muted/40"
                  )}
                  onClick={() => previewable && setPreviewFile(file)}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(file.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Seleccionar ${file.fileName}`}
                  />

                  {/* File icon */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted",
                      color
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {file.fileName}
                      </p>
                      <Badge
                        variant={categoryVariant}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {categoryLabel}
                      </Badge>
                      {file.label && (
                        <Badge
                          variant="teal"
                          className="text-[10px] px-1.5 py-0 gap-0.5"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {file.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {file.uploadedBy} · {formatDate(file.createdAt)}
                      {file.fileSize
                        ? ` · ${formatFileSize(file.fileSize)}`
                        : ""}
                    </p>
                  </div>

                  {/* Actions dropdown */}
                  <div className="flex items-center gap-1 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {previewable && (
                          <DropdownMenuItem
                            onClick={() => setPreviewFile(file)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Vista previa
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setNewFileName(file.fileName);
                            setRenameTarget(file);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Renombrar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setNewLabel(file.label || "");
                            setLabelTarget(file);
                          }}
                        >
                          <Tag className="h-4 w-4 mr-2" />
                          Editar etiqueta
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setNewCategory(file.category);
                            setCategoryTarget(file);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Cambiar categoría
                        </DropdownMenuItem>
                        {file.driveViewLink && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <a
                                href={file.driveViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir en Drive
                              </a>
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteTarget(file)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ================================================================== */}
      {/* Preview dialog                                                     */}
      {/* ================================================================== */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      >
        <DialogContent
          className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {previewFile &&
                (() => {
                  const PIcon = getFileIcon(previewFile.mimeType);
                  const pcolor = getFileColor(previewFile.mimeType);
                  return (
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted",
                        pcolor
                      )}
                    >
                      <PIcon className="h-4 w-4" />
                    </div>
                  );
                })()}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {previewFile?.fileName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {previewFile?.uploadedBy} · {previewFile && formatDate(previewFile.createdAt)}
                  {previewFile?.fileSize
                    ? ` · ${formatFileSize(previewFile.fileSize)}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {previewFile?.driveViewLink && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <a
                    href={previewFile.driveViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir en Google Drive"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {previewFile?.driveDownloadLink && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <a
                    href={previewFile.driveDownloadLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Descargar"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 bg-muted/30">
            {previewFile &&
              (previewFile.mimeType.startsWith("image/") ? (
                <div className="flex items-center justify-center h-full p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://drive.google.com/uc?id=${previewFile.driveFileId}`}
                    alt={previewFile.fileName}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <iframe
                  src={`https://drive.google.com/file/d/${previewFile.driveFileId}/preview`}
                  className="w-full h-full border-0"
                  title={previewFile.fileName}
                  allow="autoplay"
                  sandbox="allow-scripts allow-same-origin"
                />
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Delete confirmation dialog                                         */}
      {/* ================================================================== */}
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

      {/* ================================================================== */}
      {/* Rename dialog                                                      */}
      {/* ================================================================== */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar archivo</DialogTitle>
            <DialogDescription>
              Ingrese un nuevo nombre para el archivo.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="Nombre del archivo"
            maxLength={255}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameTarget(null)}
              disabled={renaming}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRename}
              disabled={renaming || !newFileName.trim()}
            >
              {renaming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Label dialog (with default labels)                                 */}
      {/* ================================================================== */}
      <Dialog
        open={!!labelTarget}
        onOpenChange={(open) => !open && setLabelTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar etiqueta</DialogTitle>
            <DialogDescription>
              Agregue o modifique la etiqueta del archivo. Deje vacío para
              quitar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {UI.foundationDocuments.defaultLabels.map((label) => (
              <Button
                key={label}
                variant={newLabel === label ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() =>
                  setNewLabel(newLabel === label ? "" : label)
                }
              >
                {label}
              </Button>
            ))}
          </div>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ej: Manual de Procedimientos, Estatutos..."
            maxLength={100}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLabelTarget(null)}
              disabled={updatingLabel}
            >
              Cancelar
            </Button>
            <Button onClick={handleLabelUpdate} disabled={updatingLabel}>
              {updatingLabel ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Category dialog                                                    */}
      {/* ================================================================== */}
      <Dialog
        open={!!categoryTarget}
        onOpenChange={(open) => !open && setCategoryTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar categoría</DialogTitle>
            <DialogDescription>
              Seleccione la nueva categoría para &quot;
              {categoryTarget?.fileName}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2">
            {categoryEntries.map(([value, label]) => (
              <Button
                key={value}
                variant={newCategory === value ? "default" : "outline"}
                className="justify-start"
                onClick={() => setNewCategory(value)}
              >
                <Badge
                  variant={CATEGORY_VARIANTS[value] || "secondary"}
                  className="mr-2 text-[10px] px-1.5 py-0"
                >
                  {label}
                </Badge>
                {label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryTarget(null)}
              disabled={updatingCategory}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCategoryUpdate}
              disabled={updatingCategory || !newCategory}
            >
              {updatingCategory ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
