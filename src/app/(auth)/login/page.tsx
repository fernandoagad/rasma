import { LoginForm } from "@/components/auth/login-form";
import { UI } from "@/constants/ui";

export default function LoginPage() {
  return (
    <div className="rounded-lg border bg-white p-8 sm:p-10 shadow-sm">
      <h2 className="mb-8 text-xl font-bold text-rasma-dark text-center">
        {UI.auth.login}
      </h2>
      <LoginForm />
    </div>
  );
}
