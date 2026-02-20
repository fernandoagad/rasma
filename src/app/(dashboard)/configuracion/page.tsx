import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Shield, Database, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default async function ConfiguracionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const items = [
    {
      href: "/configuracion/usuarios",
      icon: Users,
      title: "Gestión de Usuarios",
      description: "Crear, editar y gestionar usuarios del sistema",
    },
    {
      href: "/configuracion/auditoria",
      icon: Shield,
      title: "Registro de Auditoría",
      description: "Ver historial de acciones y cambios del sistema",
    },
    {
      href: "#",
      icon: Database,
      title: "Base de Datos",
      description: "Estado de la base de datos y respaldos",
      disabled: true,
    },
    {
      href: "/configuracion/notificaciones",
      icon: Bell,
      title: "Notificaciones",
      description: "Configurar recordatorios por email y WhatsApp",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Configuración"
        subtitle="Administración del sistema"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          if (item.disabled) {
            return (
              <Card key={item.title} className="opacity-50">
                <CardContent className="pt-2">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-rasma-dark">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  <span className="text-xs text-muted-foreground mt-2 inline-block">Próximamente</span>
                </CardContent>
              </Card>
            );
          }
          return (
            <Link key={item.title} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-2">
                  <div className="h-10 w-10 rounded-xl bg-rasma-teal/10 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-rasma-teal" />
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
