import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { UserPlus, Users, ClipboardCheck, Gift, GraduationCap } from "lucide-react";
import { getHRDashboardStats } from "@/actions/rrhh";
import { Badge } from "@/components/ui/badge";
import { PostularShortcut } from "@/components/rrhh/postular-shortcut";

const items = [
  { href: "/rrhh/postulantes", icon: UserPlus, title: "Postulantes", description: "Gestionar postulaciones y candidatos", countKey: "totalApplicants" as const },
  { href: "/rrhh/pasantias", icon: GraduationCap, title: "Pasantías", description: "Programa de pasantías universitarias", countKey: "activeInterns" as const },
  { href: "/rrhh/equipo", icon: Users, title: "Equipo", description: "Vista general del equipo profesional", countKey: "teamSize" as const },
  { href: "/rrhh/evaluaciones", icon: ClipboardCheck, title: "Evaluaciones", description: "Evaluaciones de desempeño", countKey: undefined },
  { href: "/rrhh/beneficios", icon: Gift, title: "Beneficios", description: "Gestión de beneficios", countKey: undefined },
];

export default async function RRHHPage() {
  const session = await auth();
  if (!session?.user || !["admin", "rrhh"].includes(session.user.role)) redirect("/");

  const stats = await getHRDashboardStats();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Recursos Humanos" subtitle="Gestión de personal y postulaciones" />

      {/* Postulacion shortcut */}
      <PostularShortcut />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          const count = stats && item.countKey ? stats[item.countKey] : null;

          return (
            <Link key={item.title} href={item.href}>
              <Card className="h-full hover:shadow-md cursor-pointer transition-shadow">
                <CardContent className="pt-2">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-rasma-teal/10 flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5 text-rasma-teal" />
                    </div>
                    {count !== null && count !== undefined && count > 0 && (
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-rasma-dark">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
