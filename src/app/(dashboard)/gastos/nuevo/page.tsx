import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default async function NuevoGastoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "supervisor"].includes(session.user.role)) redirect("/");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/gastos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rasma-dark transition mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Gastos
        </Link>
        <h1 className="text-2xl font-bold text-rasma-dark">Nuevo Gasto</h1>
      </div>
      <ExpenseForm />
    </div>
  );
}
