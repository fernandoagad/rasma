"use client";

import { updatePaymentStatus } from "@/actions/payments";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, CheckCircle, XCircle } from "lucide-react";

export function PaymentActions({ paymentId, currentStatus }: { paymentId: string; currentStatus: string }) {
  const router = useRouter();

  async function handleStatus(status: string) {
    await updatePaymentStatus(paymentId, status);
    router.refresh();
  }

  if (currentStatus === "pagado") {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currentStatus !== "pagado" && (
          <DropdownMenuItem onClick={() => handleStatus("pagado")} className="cursor-pointer">
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            Marcar pagado
          </DropdownMenuItem>
        )}
        {currentStatus === "pendiente" && (
          <DropdownMenuItem onClick={() => handleStatus("cancelado")} className="cursor-pointer text-rasma-red focus:text-rasma-red">
            <XCircle className="mr-2 h-4 w-4" />
            Cancelar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
