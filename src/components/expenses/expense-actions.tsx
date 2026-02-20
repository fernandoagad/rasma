"use client";

import { deleteExpense } from "@/actions/expenses";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ExternalLink, Trash2 } from "lucide-react";

interface ExpenseActionsProps {
  expenseId: string;
  receiptViewLink: string | null;
}

export function ExpenseActions({
  expenseId,
  receiptViewLink,
}: ExpenseActionsProps) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("¿Está seguro de que desea eliminar este gasto?")) return;
    await deleteExpense(expenseId);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {receiptViewLink && (
          <DropdownMenuItem asChild className="cursor-pointer">
            <a
              href={receiptViewLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver comprobante
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleDelete}
          className="cursor-pointer text-rasma-red focus:text-rasma-red"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
