import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DesignShowcase } from "./design-showcase";

export default async function DisenoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  return <DesignShowcase />;
}
