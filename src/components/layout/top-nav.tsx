"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
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
  MoreVertical,
  ChevronDown,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { OnlineAvatars } from "@/components/layout/online-avatars";
import { GlobalSearch } from "@/components/layout/global-search";
import { ChatPanel } from "@/components/chat/chat-panel";
import { usePresence } from "@/hooks/use-presence";

const navItems = [
  { href: "/", label: UI.nav.dashboard, icon: LayoutDashboard, roles: ["admin", "terapeuta", "recepcionista", "supervisor"] },
  { href: "/pacientes", label: UI.nav.patients, icon: Users, roles: ["admin", "terapeuta", "recepcionista", "supervisor"] },
  { href: "/citas", label: UI.nav.appointments, icon: Calendar, roles: ["admin", "terapeuta", "recepcionista", "supervisor"] },
  { href: "/calendario", label: UI.nav.calendar, icon: CalendarDays, roles: ["admin", "terapeuta", "recepcionista", "supervisor"] },
  { href: "/pagos", label: UI.nav.payments, icon: CreditCard, roles: ["admin", "recepcionista", "supervisor"] },
  { href: "/pagos/liquidaciones", label: "Liquidaciones", icon: Wallet, roles: ["admin", "rrhh"] },
  { href: "/notas", label: UI.nav.notes, icon: FileText, roles: ["admin", "terapeuta", "supervisor"] },
  { href: "/planes", label: UI.nav.plans, icon: ClipboardList, roles: ["admin", "terapeuta", "supervisor"] },
  { href: "/reportes", label: UI.nav.reports, icon: BarChart3, roles: ["admin", "supervisor", "rrhh"] },
  { href: "/gastos", label: UI.nav.expenses, icon: Wallet, roles: ["admin", "supervisor"] },
  { href: "/ingresos", label: UI.nav.income, icon: TrendingUp, roles: ["admin", "supervisor"] },
  { href: "/finanzas", label: UI.nav.finances, icon: Landmark, roles: ["admin", "supervisor"] },
  { href: "/documentos", label: UI.nav.documents, icon: Archive, roles: ["admin", "supervisor", "rrhh"] },
  { href: "/rrhh", label: UI.nav.rrhh, icon: Briefcase, roles: ["admin", "rrhh"] },
  { href: "/configuracion/usuarios", label: UI.nav.users, icon: UserCog, roles: ["admin"] },
  { href: "/configuracion", label: UI.nav.settings, icon: Settings, roles: ["admin"] },
  { href: "/mis-citas", label: UI.nav.myAppointments, icon: Calendar, roles: ["paciente"] },
];

// ---------------------------------------------------------------------------
// Grouped navigation
// ---------------------------------------------------------------------------

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: typeof navItems;
}

const CLINICA_ROUTES = ["/pacientes", "/citas", "/calendario", "/notas", "/planes"];
const FINANZAS_ROUTES = ["/pagos", "/pagos/liquidaciones", "/gastos", "/ingresos", "/finanzas"];
const GESTION_ROUTES = ["/reportes", "/rrhh", "/documentos", "/configuracion/usuarios", "/configuracion"];

const navGroups: NavGroup[] = [
  {
    key: "panel",
    label: UI.nav.dashboard,
    icon: LayoutDashboard,
    items: navItems.filter((i) => i.href === "/"),
  },
  {
    key: "clinica",
    label: "Clínica",
    icon: Users,
    items: navItems.filter((i) => CLINICA_ROUTES.includes(i.href)),
  },
  {
    key: "finanzas",
    label: "Finanzas",
    icon: Landmark,
    items: navItems.filter((i) => FINANZAS_ROUTES.includes(i.href)),
  },
  {
    key: "gestion",
    label: "Gestión",
    icon: Settings,
    items: navItems.filter((i) => GESTION_ROUTES.includes(i.href)),
  },
];

function getVisibleGroups(role: string): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
}

interface TopNavProps {
  role: string;
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  // Exact match for routes that have sub-routes as separate nav items
  if (href === "/configuracion") return pathname === "/configuracion";
  if (href === "/pagos") return pathname === "/pagos" || (pathname.startsWith("/pagos/") && !pathname.startsWith("/pagos/liquidaciones"));
  return pathname.startsWith(href);
}

function getPageTitle(pathname: string): string {
  if (pathname === "/") return UI.nav.dashboard;
  // Check longer paths first to match more specific routes
  const sorted = [...navItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find((item) => isNavActive(pathname, item.href));
  return match?.label ?? "";
}

export function TopNav({ role, user }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Keep presence alive (only for staff)
  const isStaffRole = !["paciente", "invitado"].includes(role);
  usePresence(isStaffRole);

  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const visibleGroups = getVisibleGroups(role);
  const pageTitle = getPageTitle(pathname);
  const roleName = UI.users.roles[user.role as keyof typeof UI.users.roles] || user.role;
  const isPatient = role === "paciente";

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="relative flex h-12 items-center px-3 lg:px-4">

          {/* ── LEFT: Mobile hamburger + Nav groups ── */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="flex h-12 items-center gap-3 px-5 border-b">
                  <Image src="/logo-rasma.png" alt="RASMA" width={24} height={24} className="rounded" />
                  <span className="font-bold text-rasma-dark">Fundación Rasma</span>
                </SheetTitle>
                {isPatient ? (
                  /* Patient: flat list */
                  <nav className="p-3 space-y-0.5">
                    {visibleItems.map((item) => {
                      const isActive = isNavActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-rasma-dark text-rasma-lime"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                ) : (
                  /* Staff: grouped sections */
                  <nav className="p-3 space-y-4">
                    {visibleGroups.map((group) => (
                      <div key={group.key}>
                        {group.key !== "panel" && (
                          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {group.label}
                          </p>
                        )}
                        <div className="space-y-0.5">
                          {group.items.map((item) => {
                            const isActive = isNavActive(pathname, item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                  isActive
                                    ? "bg-rasma-dark text-rasma-lime"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </nav>
                )}
              </SheetContent>
            </Sheet>

            {/* Desktop nav — grouped dropdowns */}
            <nav className="hidden lg:flex items-center gap-1">
              {isPatient ? (
                /* Patient: flat links */
                visibleItems.map((item) => {
                  const isActive = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-rasma-dark text-rasma-lime"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })
              ) : (
                /* Staff: grouped dropdowns */
                visibleGroups.map((group) => {
                  // Standalone link (Panel)
                  if (group.key === "panel") {
                    const item = group.items[0];
                    const isActive = isNavActive(pathname, item.href);
                    return (
                      <Link
                        key={group.key}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm font-medium transition-colors",
                          isActive
                            ? "bg-rasma-dark text-rasma-lime"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  }

                  // Group dropdown
                  const hasActiveChild = group.items.some((i) => isNavActive(pathname, i.href));
                  return (
                    <DropdownMenu key={group.key}>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm font-medium transition-colors outline-none",
                            hasActiveChild
                              ? "bg-rasma-dark text-rasma-lime"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <group.icon className="h-4 w-4" />
                          {group.label}
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        {group.items.map((item) => {
                          const isActive = isNavActive(pathname, item.href);
                          return (
                            <DropdownMenuItem key={item.href} asChild>
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-2 cursor-pointer",
                                  isActive && "font-semibold"
                                )}
                              >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })
              )}
            </nav>
          </div>

          {/* ── CENTER: Branding + page dropdown (absolutely centered) ── */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 text-sm">
              <Image src="/logo-rasma.png" alt="RASMA" width={20} height={20} className="rounded" />
              <span className="font-semibold text-rasma-dark hidden sm:inline">Fundación Rasma</span>
              <span className="text-muted-foreground/60 hidden sm:inline">/</span>

              {/* Page title with grouped dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 outline-none hover:text-foreground transition-colors">
                  <span className="text-muted-foreground">{pageTitle || "Inicio"}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-52">
                  {isPatient ? (
                    visibleItems.map((item) => {
                      const isActive = isNavActive(pathname, item.href);
                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer",
                              isActive && "font-semibold"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })
                  ) : (
                    visibleGroups.map((group, idx) => (
                      <div key={group.key}>
                        {idx > 0 && <DropdownMenuSeparator />}
                        {group.key !== "panel" && (
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {group.label}
                          </DropdownMenuLabel>
                        )}
                        {group.items.map((item) => {
                          const isActive = isNavActive(pathname, item.href);
                          return (
                            <DropdownMenuItem key={item.href} asChild>
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-2 cursor-pointer",
                                  isActive && "font-semibold"
                                )}
                              >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ── Spacer to push right section ── */}
          <div className="flex-1" />

          {/* ── RIGHT: Online avatars + Search + Bell + Avatar + menu ── */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Online user avatars — only for staff */}
            {isStaffRole && (
              <OnlineAvatars onChatOpen={() => setChatOpen(true)} />
            )}

            {/* Search icon — only for staff */}
            {isStaffRole && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Buscar (Ctrl+K)</TooltipContent>
              </Tooltip>
            )}

            {/* Chat icon for patients (simple, no online avatars) */}
            {role === "paciente" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setChatOpen(true)}
                    className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Mensajes</TooltipContent>
              </Tooltip>
            )}

            {/* Notification bell */}
            <NotificationBell />

            {/* User avatar + dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{roleName}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/perfil")}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  {UI.nav.profile}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logoutAction();
                    router.push("/login");
                    router.refresh();
                  }}
                  className="cursor-pointer text-rasma-red focus:text-rasma-red"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {UI.nav.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Global search dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Chat panel — hidden for invitado */}
      {role !== "invitado" && (
        <ChatPanel open={chatOpen} onOpenChange={setChatOpen} userRole={role} />
      )}
    </>
  );
}
