import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UI } from "@/constants/ui";
import { ProfileForms } from "@/components/auth/profile-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { BankAccountForm } from "@/components/settings/bank-account-form";
import { getBankAccount } from "@/actions/bank-accounts";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isTherapist = session.user.role === "terapeuta";
  const bankAccount = isTherapist ? await getBankAccount(session.user.id) : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title={UI.profile.title} />

      <Card>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <AvatarInitials name={session.user.name || "U"} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-rasma-dark">{session.user.name}</h2>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{UI.users.role}</p>
              <div className="mt-1">
                <StatusBadge type="role" status={session.user.role} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{UI.auth.email}</p>
              <p className="text-sm font-medium mt-1">{session.user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProfileForms userName={session.user.name || ""} />

      {isTherapist && (
        <BankAccountForm userId={session.user.id} bankAccount={bankAccount} />
      )}
    </div>
  );
}
