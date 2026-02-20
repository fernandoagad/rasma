import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPatientsList } from "@/actions/appointments";
import { PaymentForm } from "@/components/payments/payment-form";

export default async function NuevoPagoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "terapeuta") redirect("/");

  const patients = await getPatientsList();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-rasma-dark">Nuevo Pago</h1>
      <PaymentForm patients={patients} />
    </div>
  );
}
