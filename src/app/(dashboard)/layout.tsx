import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <TopNav role={session.user.role} user={session.user} />
      <main className="flex-1 p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
