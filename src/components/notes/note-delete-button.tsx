"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { deleteSessionNote } from "@/actions/notes";
import { toast } from "sonner";

export function NoteDeleteButton({ noteId }: { noteId: string }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteSessionNote(noteId);
    if (result.success) {
      toast.success("Nota eliminada");
      router.push("/notas");
    } else {
      toast.error(result.error || "Error al eliminar nota");
    }
    setDeleting(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-600 gap-1.5">
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar nota clinica</DialogTitle>
          <DialogDescription>
            Esta accion eliminara permanentemente esta nota clinica encriptada. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
