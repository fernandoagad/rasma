"use client";

import { useState, useTransition } from "react";
import { setInitialBalance } from "@/actions/finance";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function InitialBalanceEditor({ currentBalance }: { currentBalance: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(currentBalance));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    const value = Number(amount);
    if (isNaN(value) || value < 0) {
      toast.error("Ingrese un monto válido");
      return;
    }
    startTransition(async () => {
      try {
        await setInitialBalance(value);
        toast.success("Saldo inicial actualizado");
        router.refresh();
        setOpen(false);
      } catch {
        toast.error("Error al guardar el saldo inicial");
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground"
        onClick={() => {
          setAmount(String(currentBalance));
          setOpen(true);
        }}
      >
        <Pencil className="h-3 w-3 mr-1.5" />
        Editar saldo inicial
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Saldo Inicial</DialogTitle>
            <DialogDescription>
              Establece el saldo de caja previo al uso del sistema. Esto ajusta el cálculo de la posición de caja.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="block text-sm font-medium mb-1">Monto (CLP)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
