import { LoginForm } from "@/components/auth/login-form";
import { UI } from "@/constants/ui";

export default function LoginPage() {
  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-rasma-dark text-center">
        {UI.auth.login}
      </h2>
      <LoginForm />
    </div>
  );
}
