"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { UI } from "@/constants/ui";
import { deleteExpense, bulkDeleteExpenses, bulkUpdateCategory } from "@/actions/expenses";
import { toast } from "sonner";
import {
  Search,
  MoreVertical,
  Eye,
  ExternalLink,
  Trash2,
  X,
  FileText,
  Wallet,
  Loader2,
  CheckSquare,
  Tag,
} from "lucide-react";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  receiptDriveFileId: string | null;
  receiptFileName: string | null;
  receiptMimeType: string | null;
  receiptViewLink: string | null;
  notes: string | null;
  creator: { id: string; name: string } | null;
}

function canPreview(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return (
    mimeType === "application/pdf" ||
    mimeType.startsWith("image/")
  );
}

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Preview dialog
  const [previewExpense, setPreviewExpense] = useState<Expense | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Client-side filtering
  const filtered = useMemo(() => {
    if (!searchQuery) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        (e.creator?.name && e.creator.name.toLowerCase().includes(q))
    );
  }, [expenses, searchQuery]);

  const allSelected =
    filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < filtered.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteExpense(deleteTarget.id);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Gasto eliminado");
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

  const handleBulkCategory = (category: string) => {
    startTransition(async () => {
      const result = await bulkUpdateCategory(
        Array.from(selectedIds),
        category
      );
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `${(result as { count: number }).count} gastos actualizados a ${UI.expenses.categories[category] || category}`
        );
        router.refresh();
      }
    });
  };

  const handleBulkDelete = () => {
    if (
      !confirm(
        `¿Eliminar ${selectedIds.size} gasto(s) seleccionados? Esta acción no se puede deshacer.`
      )
    )
      return;

    startTransition(async () => {
      const result = await bulkDeleteExpenses(Array.from(selectedIds));
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `${(result as { count: number }).count} gastos eliminados`
        );
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      {expenses.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descripción, notas o creador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rasma-teal/30 bg-rasma-teal/5 px-4 py-2.5 flex-wrap">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {selectedIds.size} seleccionados
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Tag className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Cambiar categoría
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(UI.expenses.categories)
                  .filter(([key]) => key !== "all")
                  .map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handleBulkCategory(key)}
                    >
                      <StatusBadge
                        type="expense_category"
                        status={key}
                        className="mr-2"
                      />
                      {label}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              Eliminar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={isPending}
            >
              Deseleccionar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {expenses.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No hay gastos registrados"
          description="Registra un nuevo gasto para comenzar."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="No se encontraron gastos con esa búsqueda."
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        (
                          el as unknown as HTMLButtonElement
                        ).dataset.state = someSelected
                          ? "indeterminate"
                          : allSelected
                            ? "checked"
                            : "unchecked";
                      }
                    }}
                    onCheckedChange={toggleAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Descripción
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fecha
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Monto
                </TableHead>
                <TableHead className="hidden md:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Categoría
                </TableHead>
                <TableHead className="hidden md:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Comprobante
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const isSelected = selectedIds.has(e.id);
                const hasReceipt = !!e.receiptViewLink;
                const previewable =
                  hasReceipt && canPreview(e.receiptMimeType);

                return (
                  <TableRow
                    key={e.id}
                    className={cn(
                      "transition-colors",
                      (previewable || hasReceipt) && "cursor-pointer",
                      isSelected &&
                        "bg-rasma-teal/5 border-l-2 border-l-rasma-teal"
                    )}
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (
                        target.closest(
                          'button, a, input, [role="checkbox"], [role="menuitem"]'
                        )
                      )
                        return;
                      if (previewable) setPreviewExpense(e);
                      else if (hasReceipt)
                        window.open(e.receiptViewLink!, "_blank");
                    }}
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(e.id)}
                        aria-label={`Seleccionar ${e.description}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {e.description}
                        </p>
                        {e.creator && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            por {e.creator.name}
                          </p>
                        )}
                        {e.notes && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-[300px]">
                            {e.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(e.date + "T12:00:00").toLocaleDateString(
                        "es-CL"
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-semibold whitespace-nowrap">
                      ${(e.amount / 100).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusBadge
                        type="expense_category"
                        status={e.category}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {hasReceipt ? (
                        <button
                          onClick={() =>
                            previewable
                              ? setPreviewExpense(e)
                              : window.open(e.receiptViewLink!, "_blank")
                          }
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {e.receiptFileName
                            ? e.receiptFileName.length > 15
                              ? e.receiptFileName.slice(0, 12) + "..."
                              : e.receiptFileName
                            : "Ver"}
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground/40">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {previewable && (
                            <DropdownMenuItem
                              onClick={() => setPreviewExpense(e)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Vista previa
                            </DropdownMenuItem>
                          )}
                          {hasReceipt && (
                            <DropdownMenuItem asChild>
                              <a
                                href={e.receiptViewLink!}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir en Drive
                              </a>
                            </DropdownMenuItem>
                          )}
                          {(previewable || hasReceipt) && (
                            <DropdownMenuSeparator />
                          )}
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteTarget(e)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Receipt preview dialog */}
      <Dialog
        open={!!previewExpense}
        onOpenChange={(open) => !open && setPreviewExpense(null)}
      >
        <DialogContent
          className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {previewExpense?.receiptFileName ||
                    previewExpense?.description}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {previewExpense?.description} · $
                  {previewExpense
                    ? (previewExpense.amount / 100).toLocaleString("es-CL")
                    : ""}{" "}
                  ·{" "}
                  {previewExpense
                    ? UI.expenses.categories[previewExpense.category]
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {previewExpense?.receiptViewLink && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <a
                    href={previewExpense.receiptViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir en Google Drive"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewExpense(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 bg-muted/30">
            {previewExpense &&
              previewExpense.receiptDriveFileId &&
              (previewExpense.receiptMimeType?.startsWith("image/") ? (
                <div className="flex items-center justify-center h-full p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://drive.google.com/uc?id=${previewExpense.receiptDriveFileId}`}
                    alt={previewExpense.receiptFileName || "Comprobante"}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <iframe
                  src={`https://drive.google.com/file/d/${previewExpense.receiptDriveFileId}/preview`}
                  className="w-full h-full border-0"
                  title={previewExpense.receiptFileName || "Comprobante"}
                  allow="autoplay"
                  sandbox="allow-scripts allow-same-origin"
                />
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar gasto</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar &quot;{deleteTarget?.description}&quot;?
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
              {deleting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
