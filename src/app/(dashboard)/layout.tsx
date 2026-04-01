import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { ImpersonationBar } from "@/components/layout/impersonation-bar";
import { db } from "@/lib/db";
import { therapistAvailability } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isImpersonating = !!session.user.isImpersonating;
  const realRole = session.user.realRole || session.user.role;

  // Check if therapist has availability configured
  let showAvailabilityPrompt = false;
  if (session.user.role === "terapeuta") {
    const first = await db.query.therapistAvailability.findFirst({
      where: eq(therapistAvailability.therapistId, session.user.id),
      columns: { id: true },
    });
    showAvailabilityPrompt = !first;
  }

  return (
    <div className={`min-h-screen bg-muted/30 lg:pl-64 ${isImpersonating ? "pt-9" : ""}`}>
      <Sidebar
        role={session.user.role}
        user={session.user}
        showAvailabilityPrompt={showAvailabilityPrompt}
      />
      <main className={`${isImpersonating ? "pt-[88px]" : "pt-16"} lg:pt-8 px-5 pb-24 lg:px-10 lg:pb-10`}>
        {children}
      </main>
      <ImpersonationBar
        isImpersonating={isImpersonating}
        currentRole={session.user.role}
        realRole={realRole}
      />
    </div>
  );
}
