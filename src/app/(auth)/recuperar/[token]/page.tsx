import { NewPasswordForm } from "@/components/auth/password-reset-form";
import { UI } from "@/constants/ui";

export default async function ResetTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-rasma-dark text-center">
        {UI.auth.resetPassword}
      </h2>
      <NewPasswordForm token={token} />
    </div>
  );
}
