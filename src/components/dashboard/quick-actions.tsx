import Link from "next/link";
import {
  Plus,
  FileText,
  ClipboardList,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

interface QuickActionsProps {
  userRole: string;
}

const actions: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  roles: string[];
}[] = [
  { href: "/citas/nueva", label: "Nueva Cita", description: "Agendar sesion", icon: Plus, roles: ["admin", "terapeuta", "recepcionista", "supervisor"] },
  { href: "/notas/nueva", label: "Nueva Nota", description: "Nota de sesion", icon: FileText, roles: ["admin", "terapeuta", "supervisor"] },
  { href: "/planes/nuevo", label: "Nuevo Plan", description: "Plan de tratamiento", icon: ClipboardList, roles: ["admin", "terapeuta", "supervisor"] },
  { href: "/calendario", label: "Ver Calendario", description: "Agenda completa", icon: CalendarDays, roles: ["admin", "terapeuta", "recepcionista", "supervisor"] },
];

export function QuickActions({ userRole }: QuickActionsProps) {
  const visible = actions.filter((a) => a.roles.includes(userRole));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {visible.map((action) => (
        <Link key={action.href} href={action.href} className="group">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 transition-all group-hover:bg-zinc-50 group-hover:shadow-sm group-hover:-translate-y-0.5">
            <div className="h-9 w-9 rounded-xl bg-rasma-dark text-rasma-lime flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <action.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-rasma-dark leading-tight truncate">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{action.description}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
