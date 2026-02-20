import { auth } from "@/lib/auth";
import { getExpenseById } from "@/actions/expenses";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditarGastoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "supervisor"].includes(session.user.role)) redirect("/");

  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) redirect("/gastos");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/gastos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rasma-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a gastos
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-rasma-dark">Editar Gasto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Modifique los datos del gasto registrado.
        </p>
      </div>

      <ExpenseForm expense={expense} />
    </div>
  );
}
