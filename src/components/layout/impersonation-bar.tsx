"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, X, ChevronDown, Users, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { startImpersonation, stopImpersonation, getImpersonatableUsers } from "@/actions/impersonate";
import { toast } from "sonner";

const ROLES = [
  { value: "terapeuta", label: "Terapeuta" },
  { value: "recepcionista", label: "Recepcionista" },
  { value: "supervisor", label: "Supervisor" },
  { value: "rrhh", label: "RRHH" },
  { value: "paciente", label: "Paciente" },
  { value: "invitado", label: "Invitado" },
];

interface Props {
  isImpersonating: boolean;
  currentRole: string;
  realRole?: string;
}

export function ImpersonationBar({ isImpersonating, currentRole, realRole }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [loadedUsers, setLoadedUsers] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Only show for admins (real admins, not impersonated)
  if (realRole !== "admin" && currentRole !== "admin" && !isImpersonating) return null;

  const loadUsers = () => {
    if (loadedUsers) return;
    getImpersonatableUsers().then((u) => { setUsers(u); setLoadedUsers(true); });
  };

  async function handleSwitchRole(role: string) {
    setSwitching(true);
    const result = await startImpersonation({ role });
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Viendo como: ${ROLES.find((r) => r.value === role)?.label || role}`);
      router.refresh();
    }
    setSwitching(false);
  }

  async function handleSwitchUser(userId: string, userName: string) {
    setSwitching(true);
    const result = await startImpersonation({ userId });
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Viendo como: ${userName}`);
      router.refresh();
    }
    setSwitching(false);
  }

  async function handleStop() {
    setSwitching(true);
    await stopImpersonation();
    toast.success("Vista restaurada a administrador");
    router.refresh();
    setSwitching(false);
  }

  if (isImpersonating) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950">
        <div className="flex items-center justify-between px-4 py-1.5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4" />
            Viendo como: {ROLES.find((r) => r.value === currentRole)?.label || currentRole}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu onOpenChange={(open) => { if (open) loadUsers(); }}>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold text-amber-950 hover:bg-amber-600/30 gap-1" disabled={switching}>
                  Cambiar <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                <DropdownMenuLabel>Cambiar rol</DropdownMenuLabel>
                {ROLES.map((role) => (
                  <DropdownMenuItem
                    key={role.value}
                    onClick={() => handleSwitchRole(role.value)}
                    className={currentRole === role.value ? "bg-zinc-100 font-semibold" : ""}
                  >
                    <Users className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    {role.label}
                  </DropdownMenuItem>
                ))}
                {users.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Ver como usuario</DropdownMenuLabel>
                    {users.map((u) => (
                      <DropdownMenuItem key={u.id} onClick={() => handleSwitchUser(u.id, u.name)}>
                        <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <span className="truncate">{u.name}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{u.role}</span>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleStop}
              className="h-7 text-xs font-semibold text-amber-950 hover:bg-amber-600/30 gap-1"
              disabled={switching}
            >
              <X className="h-3 w-3" /> Salir
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not impersonating — show the "View as" button for admins
  return (
    <div className="fixed bottom-20 lg:bottom-4 right-4 z-50">
      <DropdownMenu onOpenChange={(open) => { if (open) loadUsers(); }}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="rounded-xl shadow-lg bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 gap-1.5 h-9"
            disabled={switching}
          >
            <Eye className="h-3.5 w-3.5" />
            Ver como...
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
          <DropdownMenuLabel>Cambiar rol</DropdownMenuLabel>
          {ROLES.map((role) => (
            <DropdownMenuItem key={role.value} onClick={() => handleSwitchRole(role.value)}>
              <Users className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              {role.label}
            </DropdownMenuItem>
          ))}
          {users.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Ver como usuario</DropdownMenuLabel>
              {users.map((u) => (
                <DropdownMenuItem key={u.id} onClick={() => handleSwitchUser(u.id, u.name)}>
                  <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span className="truncate">{u.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{u.role}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
