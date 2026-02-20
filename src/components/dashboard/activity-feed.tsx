import { Users, Calendar, CreditCard, FileText, ClipboardList, UserCog, Settings, LogIn, Pencil, Trash2, type LucideIcon } from "lucide-react";

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
  auth: "sesión",
};

const actionLabels: Record<string, string> = {
  create: "creó",
  update: "editó",
  delete: "eliminó",
  view: "vió",
  login: "ingresó",
  logout: "salió",
  password_reset: "restableció clave",
  email_change: "cambió correo",
};

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-600",
  update: "bg-blue-100 text-blue-600",
  delete: "bg-red-100 text-red-500",
  login: "bg-gray-100 text-gray-500",
  logout: "bg-gray-100 text-gray-500",
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
      <p className="text-xs text-muted-foreground py-4 text-center">
        Sin actividad reciente.
      </p>
    );
  }

  return (
    <div>
      {activities.map((activity) => {
        const Icon = entityIcons[activity.entityType] || FileText;
        const actionText = actionLabels[activity.action] || activity.action;
        const entityText = entityLabels[activity.entityType] || activity.entityType;
        const colorClass = actionColors[activity.action] || "bg-muted text-muted-foreground";

        return (
          <div
            key={activity.id}
            className="flex items-center gap-2.5 py-1.5"
          >
            <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 ${colorClass}`}>
              <Icon className="h-2.5 w-2.5" />
            </div>
            <p className="text-[11px] flex-1 min-w-0 truncate">
              <span className="font-medium text-foreground/80">{activity.userName || "Sistema"}</span>
              {" "}
              <span className="text-muted-foreground">
                {actionText} {entityText}
              </span>
            </p>
            <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
              {formatRelativeTime(activity.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
