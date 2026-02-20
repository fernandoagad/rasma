"use client";

import { useActionState, useState, useTransition } from "react";
import { createUser, updateUser, adminResetPassword, bulkUpdateUsers } from "@/actions/users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  KeyRound,
  Copy,
  MoreHorizontal,
  Pencil,
  UserCog,
  XCircle,
} from "lucide-react";
import { UI } from "@/constants/ui";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { cn } from "@/lib/utils";

const AREA_OPTIONS = [
  "Clínica",
  "Salud Mental",
  "Atención Directa",
  "Neurodesarrollo",
  "Lenguaje",
  "Product",
];

const STATUS_OPTIONS = [
  { value: "evaluando", label: "Evaluando" },
  { value: "disponible", label: "Disponible" },
  { value: "completo", label: "Completo" },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  specialty?: string | null;
  area?: string | null;
  therapistStatus?: string | null;
  attentionType?: string | null;
  image?: string | null;
  createdAt: Date;
}

export function UserManagement({ users }: { users: User[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, startBulkTransition] = useTransition();

  const [state, formAction, isPending] = useActionState(
    async (
      prev: { error?: string; success?: boolean } | undefined,
      formData: FormData
    ) => {
      const result = await createUser(prev, formData);
      if (result?.success) {
        setCreateOpen(false);
        toast.success(UI.users.created);
      }
      return result;
    },
    undefined
  );

  const [editState, editFormAction, editPending] = useActionState(
    async (
      prev: { error?: string; success?: boolean } | undefined,
      formData: FormData
    ) => {
      if (!editUser) return prev;
      const result = await updateUser(editUser.id, prev, formData);
      if (result?.success) {
        setEditUser(null);
        toast.success(UI.users.updated);
      }
      return result;
    },
    undefined
  );

  const handleResetPassword = async (userId: string, userName: string) => {
    try {
      const result = await adminResetPassword(userId);
      if (result.success && result.tempPassword) {
        setTempPassword(result.tempPassword);
        toast.success(`Contraseña restablecida para ${userName}`);
      }
    } catch {
      toast.error("Error al restablecer la contraseña.");
    }
  };

  const allSelected = users.length > 0 && selectedIds.size === users.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < users.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = (updates: Parameters<typeof bulkUpdateUsers>[1]) => {
    startBulkTransition(async () => {
      const result = await bulkUpdateUsers(Array.from(selectedIds), updates);
      if (result.success) {
        toast.success(`${selectedIds.size} usuarios actualizados`);
        setSelectedIds(new Set());
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rasma-teal/30 bg-rasma-teal/5 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selectedIds.size} {UI.bulk.selected}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkPending}>
                  {UI.bulk.changeRole}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(UI.users.roles).map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => handleBulkAction({ role: value as "admin" | "terapeuta" | "recepcionista" | "supervisor" })}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkPending}>
                  {UI.bulk.changeArea}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {AREA_OPTIONS.map((area) => (
                  <DropdownMenuItem
                    key={area}
                    onClick={() => handleBulkAction({ area })}
                  >
                    {area}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkPending}>
                  {UI.bulk.changeStatus}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {STATUS_OPTIONS.map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={() => handleBulkAction({ therapistStatus: s.value as "evaluando" | "disponible" | "completo" })}
                  >
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkPending}
              className="text-rasma-red border-rasma-red/30 hover:bg-rasma-red/5"
              onClick={() => handleBulkAction({ active: false })}
            >
              {UI.bulk.deactivate}
            </Button>
          </div>
        </div>
      )}

      {/* Create user button */}
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {UI.users.newUser}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{UI.users.newUser}</DialogTitle>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              {state?.error && (
                <p className="text-sm text-rasma-red">{state.error}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" name="name" required minLength={2} placeholder="Dr. Felipe Rivas" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{UI.auth.email}</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{UI.auth.password}</Label>
                  <Input id="password" name="password" type="password" required minLength={8} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{UI.users.role}</Label>
                  <Select name="role" defaultValue="terapeuta">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UI.users.roles).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty">{UI.professionals.specialty}</Label>
                  <Input id="specialty" name="specialty" placeholder="Psiquiatra Adulto" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">{UI.professionals.area}</Label>
                  <Select name="area">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar área" />
                    </SelectTrigger>
                    <SelectContent>
                      {AREA_OPTIONS.map((area) => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="therapistStatus">{UI.professionals.status}</Label>
                  <Select name="therapistStatus">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attentionType">{UI.professionals.attentionType}</Label>
                  <Input id="attentionType" name="attentionType" placeholder="Diagnóstico Adulto" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? UI.common.loading : UI.common.save}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit user dialog */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{UI.users.editUser}</DialogTitle>
            </DialogHeader>
            <form action={editFormAction} className="space-y-4">
              {editState?.error && (
                <p className="text-sm text-rasma-red">{editState.error}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre completo</Label>
                  <Input id="edit-name" name="name" required minLength={2} defaultValue={editUser.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">{UI.auth.email}</Label>
                  <Input id="edit-email" name="email" type="email" required defaultValue={editUser.email} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">{UI.users.role}</Label>
                  <Select name="role" defaultValue={editUser.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UI.users.roles).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-active">Estado de cuenta</Label>
                  <Select name="active" defaultValue={editUser.active ? "true" : "false"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{UI.users.active}</SelectItem>
                      <SelectItem value="false">{UI.users.inactive}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-specialty">{UI.professionals.specialty}</Label>
                  <Input id="edit-specialty" name="specialty" defaultValue={editUser.specialty || ""} placeholder="Psiquiatra Adulto" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-area">{UI.professionals.area}</Label>
                  <Select name="area" defaultValue={editUser.area || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar área" />
                    </SelectTrigger>
                    <SelectContent>
                      {AREA_OPTIONS.map((area) => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-therapistStatus">{UI.professionals.status}</Label>
                  <Select name="therapistStatus" defaultValue={editUser.therapistStatus || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-attentionType">{UI.professionals.attentionType}</Label>
                  <Input id="edit-attentionType" name="attentionType" defaultValue={editUser.attentionType || ""} placeholder="Diagnóstico Adulto" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={editPending}>
                  {editPending ? UI.common.loading : UI.common.save}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Temp password dialog */}
      {tempPassword && (
        <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contraseña Temporal</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                La nueva contraseña temporal es:
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3 font-mono">
                <span className="flex-1">{tempPassword}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    toast.success("Copiado al portapapeles");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Comparta esta contraseña de forma segura. El usuario deberá
                cambiarla al iniciar sesión.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Professionals table — matches asset design */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-4">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as unknown as HTMLButtonElement).dataset.state = someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked";
                    }
                  }}
                  onCheckedChange={toggleAll}
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Profesional
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Especialidad
              </TableHead>
              <TableHead className="hidden sm:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="hidden lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Atención
              </TableHead>
              <TableHead className="hidden lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Área
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelected = selectedIds.has(user.id);
              return (
                <TableRow
                  key={user.id}
                  className={cn(
                    "transition-colors",
                    isSelected && "bg-rasma-teal/5 border-l-2 border-l-rasma-teal"
                  )}
                >
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(user.id)}
                      aria-label={`Seleccionar ${user.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.image}
                          alt={user.name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <AvatarInitials name={user.name} size="sm" className="h-9 w-9" />
                      )}
                      <span className="font-medium text-sm">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {user.specialty || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {user.therapistStatus ? (
                      <StatusBadge type="user" status={user.therapistStatus} />
                    ) : (
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        user.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                      )}>
                        {user.active ? UI.users.active : UI.users.inactive}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {user.attentionType || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {user.area ? (
                      <StatusBadge type="area" status={user.area} />
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditUser(user)}
                          className="cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {UI.common.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleResetPassword(user.id, user.name)}
                          className="cursor-pointer"
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          {UI.users.resetPassword}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            startBulkTransition(async () => {
                              const result = await bulkUpdateUsers([user.id], { active: !user.active });
                              if (result.success) {
                                toast.success(user.active ? UI.users.deactivated : "Usuario activado");
                              }
                            });
                          }}
                          className={cn(
                            "cursor-pointer",
                            user.active && "text-rasma-red focus:text-rasma-red"
                          )}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          {user.active ? UI.bulk.deactivate : "Activar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
