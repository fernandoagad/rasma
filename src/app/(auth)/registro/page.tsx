import { RegisterForm } from "@/components/auth/register-form";

export default function RegistroPage() {
  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-rasma-dark text-center">
        Crear cuenta
      </h2>
      <RegisterForm />
    </div>
  );
}
