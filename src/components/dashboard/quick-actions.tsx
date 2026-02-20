import Link from "next/link";
import {
  Plus,
  FileText,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  userRole: string;
}

const actions = [
  {
    href: "/citas/nueva",
    label: "Cita",
    icon: Plus,
    roles: ["admin", "terapeuta", "recepcionista", "supervisor"],
    primary: true,
  },
  {
    href: "/notas/nueva",
    label: "Nota",
    icon: FileText,
    roles: ["admin", "terapeuta", "supervisor"],
    primary: false,
  },
  {
    href: "/planes/nuevo",
    label: "Plan",
    icon: ClipboardList,
    roles: ["admin", "terapeuta", "supervisor"],
    primary: false,
  },
  {
    href: "/calendario",
    label: "Calendario",
    icon: CalendarDays,
    roles: ["admin", "terapeuta", "recepcionista", "supervisor"],
    primary: false,
  },
];

export function QuickActions({ userRole }: QuickActionsProps) {
  const visible = actions.filter((a) => a.roles.includes(userRole));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visible.map((action) => (
        <Button
          key={action.href}
          variant={action.primary ? "default" : "outline"}
          size="sm"
          className={`h-7 text-xs gap-1.5 rounded-lg ${
            action.primary
              ? "bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          asChild
        >
          <Link href={action.href}>
            <action.icon className="h-3 w-3" />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
