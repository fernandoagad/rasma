import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEmailTemplates } from "@/actions/email-templates";
import { EmailTemplatesClient } from "@/components/email-templates/email-templates-client";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PlantillasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const templates = await getEmailTemplates();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Link
        href="/configuracion"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rasma-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a configuración
      </Link>

      <PageHeader
        title="Plantillas de Email"
        subtitle="Ver y personalizar los correos automáticos del sistema"
      />

      <EmailTemplatesClient templates={templates} />
    </div>
  );
}
