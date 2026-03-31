import { Users, Calendar, CreditCard, FileText, ClipboardList, UserCog, Settings, LogIn, type LucideIcon } from "lucide-react";

type ActivityRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: Date;
  userName: string | null;
};

const entityIcons: Record<string, LucideIcon> = {
  patient: Users,
  appointment: Calendar,
  payment: CreditCard,
  session_note: FileText,
  treatment_plan: ClipboardList,
  user: UserCog,
  settings: Settings,
  auth: LogIn,
};

const entityLabels: Record<string, string> = {
  patient: "paciente",
  appointment: "cita",
  payment: "pago",
  session_note: "nota",
  treatment_plan: "plan",
  user: "usuario",
  settings: "config",
  auth: "sesion",
};

const actionLabels: Record<string, string> = {
  create: "creo",
  update: "edito",
  delete: "elimino",
  view: "vio",
  login: "ingreso",
  logout: "salio",
  password_reset: "restablecio clave",
  email_change: "cambio correo",
};

const actionColors: Record<string, string> = {
  create: "bg-rasma-dark text-white",
  update: "bg-rasma-dark text-white",
  delete: "bg-rasma-dark text-white",
  login: "bg-rasma-dark text-white",
  logout: "bg-rasma-dark text-white",
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

interface ActivityFeedProps {
  activities: ActivityRow[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Sin actividad reciente.
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {activities.map((activity) => {
        const Icon = entityIcons[activity.entityType] || FileText;
        const actionText = actionLabels[activity.action] || activity.action;
        const entityText = entityLabels[activity.entityType] || activity.entityType;
        const colorClass = actionColors[activity.action] || "bg-rasma-dark text-white";

        return (
          <div
            key={activity.id}
            className="flex items-center gap-3 py-2"
          >
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm flex-1 min-w-0 truncate">
              <span className="font-semibold text-rasma-dark">{activity.userName || "Sistema"}</span>
              {" "}
              <span className="text-muted-foreground">
                {actionText} {entityText}
              </span>
            </p>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0 font-medium">
              {formatRelativeTime(activity.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
