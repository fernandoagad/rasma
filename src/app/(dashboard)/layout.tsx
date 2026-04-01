import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-muted/30 lg:pl-64">
      <Sidebar role={session.user.role} user={session.user} />
      <main className="pt-16 lg:pt-8 px-5 pb-24 lg:px-10 lg:pb-10">
        {children}
      </main>
    </div>
  );
}
