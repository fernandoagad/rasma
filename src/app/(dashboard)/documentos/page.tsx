import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getFoundationDocuments, getFoundationInfo } from "@/actions/foundation-documents";
import { FoundationDocuments } from "@/components/foundation/foundation-documents";
import { FoundationInfoCard } from "@/components/foundation/foundation-info-card";

export default async function DocumentosPage() {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "supervisor", "rrhh"].includes(session.user.role)
  ) {
    redirect("/");
  }

  const [files, info] = await Promise.all([
    getFoundationDocuments(),
    getFoundationInfo(),
  ]);

  const isAdmin = session.user.role === "admin";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Documentos de la Fundación"
        subtitle="Información institucional, manuales, documentos legales y normativas"
      />
      <FoundationInfoCard info={info} isAdmin={isAdmin} />
      <FoundationDocuments files={files} />
    </div>
  );
}
