"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  CreditCard,
  FileText,
  ClipboardList,
  BarChart3,
  Briefcase,
  Settings,
  UserCog,
  Menu,
  LogOut,
  User,
  Search,
  MessageSquare,
  Wallet,
  Landmark,
  TrendingUp,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UI } from "@/constants/ui";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { logoutAction } from "@/actions/auth";
import { NotificationBell } from "@/components/layout/notification-bell";
import { GlobalSearch } from "@/components/layout/global-search";
import { ChatPanel } from "@/components/chat/chat-panel";
import { usePresence } from "@/hooks/use-presence";

/* ─── Nav data ─── */

const navItems = [
  { href: "/", label: UI.nav.dashboard, icon: LayoutDashboard, roles: ["admin", "terapeuta", "recepcionista", "supervisor"], group: "panel" },
  { href: "/pacientes", label: UI.nav.patients, icon: Users, roles: ["admin", "terapeuta", "recepcionista", "supervisor"], group: "clinica" },
  { href: "/citas", label: UI.nav.appointments, icon: Calendar, roles: ["admin", "terapeuta", "recepcionista", "supervisor"], group: "clinica" },
  { href: "/calendario", label: UI.nav.calendar, icon: CalendarDays, roles: ["admin", "terapeuta", "recepcionista", "supervisor"], group: "clinica" },
  { href: "/notas", label: UI.nav.notes, icon: FileText, roles: ["admin", "terapeuta", "supervisor"], group: "clinica" },
  { href: "/planes", label: UI.nav.plans, icon: ClipboardList, roles: ["admin", "terapeuta", "supervisor"], group: "clinica" },
  { href: "/pagos", label: UI.nav.payments, icon: CreditCard, roles: ["admin", "recepcionista", "supervisor"], group: "finanzas" },
  { href: "/pagos/liquidaciones", label: "Liquidaciones", icon: Wallet, roles: ["admin", "rrhh"], group: "finanzas" },
  { href: "/gastos", label: UI.nav.expenses, icon: Wallet, roles: ["admin", "supervisor"], group: "finanzas" },
  { href: "/ingresos", label: UI.nav.income, icon: TrendingUp, roles: ["admin", "supervisor"], group: "finanzas" },
  { href: "/finanzas", label: UI.nav.finances, icon: Landmark, roles: ["admin", "supervisor"], group: "finanzas" },
  { href: "/reportes", label: UI.nav.reports, icon: BarChart3, roles: ["admin", "supervisor", "rrhh"], group: "gestion" },
  { href: "/documentos", label: UI.nav.documents, icon: Archive, roles: ["admin", "supervisor", "rrhh"], group: "gestion" },
  { href: "/rrhh", label: UI.nav.rrhh, icon: Briefcase, roles: ["admin", "rrhh"], group: "gestion" },
  { href: "/configuracion/usuarios", label: UI.nav.users, icon: UserCog, roles: ["admin"], group: "gestion" },
  { href: "/configuracion", label: UI.nav.settings, icon: Settings, roles: ["admin"], group: "gestion" },
  { href: "/mis-citas", label: UI.nav.myAppointments, icon: Calendar, roles: ["paciente"], group: "panel" },
];

const groupLabels: Record<string, string> = {
  clinica: "Clínica",
  finanzas: "Finanzas",
  gestion: "Gestión",
};

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/configuracion") return pathname === "/configuracion";
  if (href === "/pagos")
    return pathname === "/pagos" || (pathname.startsWith("/pagos/") && !pathname.startsWith("/pagos/liquidaciones"));
  return pathname.startsWith(href);
}

/* ─── Shared nav renderer ─── */

function SidebarNav({
  role,
  pathname,
  onNavigate,
}: {
  role: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const visible = navItems.filter((item) => item.roles.includes(role));

  // Group items (preserve order)
  const groups: { key: string; label: string | null; items: typeof visible }[] = [];
  let currentGroup = "";

  for (const item of visible) {
    if (item.group !== currentGroup) {
      currentGroup = item.group;
      groups.push({
        key: item.group,
        label: groupLabels[item.group] ?? null,
        items: [],
      });
    }
    groups[groups.length - 1].items.push(item);
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
      {groups.map((group) => (
        <div key={group.key}>
          {group.label && (
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all",
                    active
                      ? "bg-rasma-dark text-rasma-lime shadow-sm"
                      : "text-rasma-gray-700 hover:bg-rasma-gray-100 hover:text-rasma-dark"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-rasma-lime" : "text-rasma-gray-400")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/* ─── Main export ─── */

interface SidebarProps {
  role: string;
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

export function Sidebar({ role, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const isStaffRole = !["paciente", "invitado"].includes(role);
  usePresence(isStaffRole);

  const roleName = UI.users.roles[user.role as keyof typeof UI.users.roles] || user.role;

  async function handleLogout() {
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* ════════════════════════════════════════════ */}
      {/* DESKTOP SIDEBAR                             */}
      {/* ════════════════════════════════════════════ */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 z-30 flex-col border-r border-border/60 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-border/40">
          <Image src="/logo-rasma.png" alt="RASMA" width={32} height={32} className="rounded-lg" />
          <div>
            <p className="font-bold text-rasma-dark text-[15px] leading-tight">Fundación Rasma</p>
            <p className="text-xs text-muted-foreground leading-tight">Gestión Clínica</p>
          </div>
        </div>

        {/* Search trigger */}
        {isStaffRole && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 w-full rounded-xl border border-border/60 bg-rasma-gray-100/60 px-3 py-2 text-sm text-muted-foreground hover:bg-rasma-gray-100 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Buscar...</span>
              <kbd className="text-xs bg-white border rounded px-1.5 py-0.5 text-muted-foreground font-mono">
                Ctrl+K
              </kbd>
            </button>
          </div>
        )}

        {/* Nav items */}
        <SidebarNav role={role} pathname={pathname} />

        {/* Bottom utilities */}
        <div className="shrink-0 border-t border-border/40 px-3 py-2">
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-[14px] font-medium text-rasma-gray-700 hover:bg-rasma-gray-100 transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-rasma-gray-400" />
            Mensajes
          </button>
        </div>

        {/* User section */}
        <div className="shrink-0 border-t border-border/40 p-3">
          <div className="flex items-center gap-3 px-2 mb-3">
            <AvatarInitials name={user.name || ""} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-rasma-dark truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{roleName}</p>
            </div>
            <NotificationBell />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/perfil")}
              className="flex items-center justify-center gap-2 flex-1 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-rasma-gray-100 hover:text-rasma-dark transition-colors border border-border/60"
            >
              <User className="h-4 w-4" />
              Mi Perfil
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 flex-1 rounded-xl px-3 py-2 text-sm font-medium text-rasma-red hover:bg-red-50 border border-red-200/60 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════ */}
      {/* MOBILE HEADER                               */}
      {/* ════════════════════════════════════════════ */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b bg-white flex items-center px-3 gap-2">
        {/* Hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetTitle className="flex items-center gap-3 h-14 px-5 border-b shrink-0">
              <Image src="/logo-rasma.png" alt="RASMA" width={28} height={28} className="rounded-lg" />
              <span className="font-bold text-rasma-dark text-[15px]">Fundación Rasma</span>
            </SheetTitle>

            <SidebarNav role={role} pathname={pathname} onNavigate={() => setMobileOpen(false)} />

            {/* User section in mobile sheet */}
            <div className="shrink-0 border-t border-border/40 p-3">
              <div className="flex items-center gap-3 px-2 mb-2">
                <AvatarInitials name={user.name || ""} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-rasma-dark truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{roleName}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { router.push("/perfil"); setMobileOpen(false); }}
                  className="flex items-center gap-2 flex-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-rasma-gray-100 hover:text-rasma-dark transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  Mi Perfil
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 flex-1 rounded-lg px-2.5 py-1.5 text-xs text-rasma-red hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Salir
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo (centered) */}
        <div className="flex-1 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-rasma.png" alt="RASMA" width={24} height={24} className="rounded" />
            <span className="font-bold text-rasma-dark text-sm">RASMA</span>
          </Link>
        </div>

        {/* Right utilities */}
        <div className="flex items-center gap-0.5 shrink-0">
          {isStaffRole && (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center h-10 w-10 rounded-lg text-muted-foreground hover:bg-rasma-gray-100 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
          <NotificationBell />
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center justify-center h-10 w-10 rounded-lg text-muted-foreground hover:bg-rasma-gray-100 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════ */}
      {/* MOBILE BOTTOM NAV BAR                        */}
      {/* ════════════════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border/60 safe-area-bottom">
        <div className="flex items-stretch h-16">
          {getMobileBottomTabs(role).map((tab) => {
            const active = isNavActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors relative",
                  active
                    ? "text-rasma-dark"
                    : "text-muted-foreground"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-rasma-dark" />
                )}
                <tab.icon className={cn("h-5 w-5", active && "text-rasma-dark")} />
                {tab.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground transition-colors",
            )}
          >
            <Menu className="h-5 w-5" />
            Mas
          </button>
        </div>
      </nav>

      {/* ════════════════════════════════════════════ */}
      {/* DIALOGS                                     */}
      {/* ════════════════════════════════════════════ */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      {role !== "invitado" && (
        <ChatPanel open={chatOpen} onOpenChange={setChatOpen} userRole={role} />
      )}
    </>
  );
}

/* ─── Mobile bottom tab config ─── */

function getMobileBottomTabs(role: string) {
  if (role === "paciente") {
    return [
      { href: "/mis-citas", label: "Citas", icon: Calendar },
    ];
  }

  const tabs = [
    { href: "/", label: "Panel", icon: LayoutDashboard },
    { href: "/citas", label: "Citas", icon: Calendar },
    { href: "/calendario", label: "Agenda", icon: CalendarDays },
    { href: "/pacientes", label: "Pacientes", icon: Users },
  ];

  return tabs;
}
