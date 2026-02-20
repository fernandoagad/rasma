import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default async function NuevoGastoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "supervisor"].includes(session.user.role)) redirect("/");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-rasma-dark">Nuevo Gasto</h1>
      <ExpenseForm />
    </div>
  );
}
