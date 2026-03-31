import Link from "next/link";
import {
  Plus,
  FileText,
  ClipboardList,
  CalendarDays,
} from "lucide-react";

interface QuickActionsProps {
  userRole: string;
}

const actions = [
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
          <div className="flex items-center gap-3 rounded-md border border-border bg-white px-4 py-3.5 transition-colors group-hover:bg-zinc-50">
            <action.icon className="h-5 w-5 text-rasma-dark shrink-0" />
            <div>
              <p className="font-semibold text-sm text-rasma-dark leading-tight">{action.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{action.description}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
