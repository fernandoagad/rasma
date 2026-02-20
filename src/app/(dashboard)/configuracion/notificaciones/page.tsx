import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNotificationSettings, getNotificationOverview } from "@/actions/notifications";
import { NotificationSettingsForm } from "@/components/notifications/notification-settings-form";
import Link from "next/link";
import { ArrowLeft, Bell, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Badge } from "@/components/ui/badge";

export default async function NotificacionesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const [settings, overview] = await Promise.all([
    getNotificationSettings(),
    getNotificationOverview(),
  ]);

  const statCards = [
    {
      title: "Email",
      value: overview.emailEnabled,
      sub: "pacientes con email habilitado",
      icon: Mail,
      color: "text-rasma-teal",
      bg: "bg-rasma-teal/10",
    },
    {
      title: "WhatsApp",
      value: overview.whatsappEnabled,
      sub: "pacientes con WhatsApp habilitado",
      icon: MessageSquare,
      color: "text-rasma-green",
      bg: "bg-rasma-green/10",
    },
    {
      title: "Configurados",
      value: overview.configured,
      sub: "pacientes con preferencias",
      icon: Bell,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver a configuración
      </Link>

      <PageHeader
        title="Notificaciones"
        subtitle="Configurar notificaciones por email y recordatorios"
      />

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <NotificationSettingsForm settings={settings} />

      {/* Patient preferences list */}
      {overview.preferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferencias por Paciente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {overview.preferences.map((pref) => {
                const patientName = `${pref.patient.firstName} ${pref.patient.lastName}`;
                return (
                  <div key={pref.patientId} className="flex items-center gap-3 px-4 py-3">
                    <AvatarInitials name={patientName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/pacientes/${pref.patientId}`} className="text-sm font-medium hover:text-rasma-teal">
                        {patientName}
                      </Link>
                      <p className="text-xs text-muted-foreground">{pref.patient.email || "Sin email"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={pref.emailEnabled ? "success" : "muted"} className="text-[10px]">
                        Email {pref.emailEnabled ? "activo" : "inactivo"}
                      </Badge>
                      <Badge variant={pref.whatsappEnabled ? "success" : "muted"} className="text-[10px]">
                        WA {pref.whatsappEnabled ? "activo" : "inactivo"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{pref.reminderHoursBefore}h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
