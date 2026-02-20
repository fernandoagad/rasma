"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Pencil,
  Loader2,
  Hash,
  MapPin,
  User,
  Calendar,
  Mail,
  Phone,
  FileCheck,
  Shield,
  Users,
  Plus,
  Trash2,
  Landmark,
} from "lucide-react";
import {
  updateFoundationInfo,
  type FoundationInfo,
  type BoardMember,
} from "@/actions/foundation-documents";
import { toast } from "sonner";

interface Props {
  info: FoundationInfo;
  isAdmin: boolean;
}

const infoFields: {
  key: keyof Omit<FoundationInfo, "boardMembers">;
  label: string;
  icon: React.ElementType;
  placeholder: string;
}[] = [
  { key: "name", label: "Nombre", icon: Building2, placeholder: "Fundación RASMA" },
  { key: "legalName", label: "Razón social", icon: FileCheck, placeholder: "Razón social completa" },
  { key: "rut", label: "RUT", icon: Hash, placeholder: "12.345.678-9" },
  { key: "address", label: "Dirección", icon: MapPin, placeholder: "Dirección de la fundación" },
  { key: "legalRepresentative", label: "Representante legal", icon: User, placeholder: "Nombre del representante" },
  { key: "incorporationDate", label: "Fecha de constitución", icon: Calendar, placeholder: "DD/MM/AAAA" },
  { key: "registrationNumber", label: "N° de registro", icon: Hash, placeholder: "Número de inscripción" },
  { key: "nature", label: "Naturaleza", icon: Landmark, placeholder: "Fundación" },
  { key: "status", label: "Estado", icon: Shield, placeholder: "Vigente" },
  { key: "email", label: "Correo electrónico", icon: Mail, placeholder: "contacto@fundacion.cl" },
  { key: "phone", label: "Teléfono", icon: Phone, placeholder: "+56 9 1234 5678" },
];

// Fields shown in the main display (excludes name/legalName/status which are shown prominently)
const displayFields = infoFields.filter(
  (f) => !["name", "legalName", "status"].includes(f.key)
);

export function FoundationInfoCard({ info, isAdmin }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FoundationInfo>(info);
  const [isPending, startTransition] = useTransition();

  const hasAnyInfo = infoFields.some((f) => {
    const val = info[f.key];
    return typeof val === "string" && val.trim();
  });

  const openEdit = () => {
    setFormData(info);
    setIsEditing(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateFoundationInfo(formData);
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("Información de la fundación actualizada.");
        setIsEditing(false);
        router.refresh();
      }
    });
  };

  const addBoardMember = () => {
    setFormData((prev) => ({
      ...prev,
      boardMembers: [...prev.boardMembers, { role: "", name: "", rut: "" }],
    }));
  };

  const updateBoardMember = (index: number, field: keyof BoardMember, value: string) => {
    setFormData((prev) => ({
      ...prev,
      boardMembers: prev.boardMembers.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    }));
  };

  const removeBoardMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      boardMembers: prev.boardMembers.filter((_, i) => i !== index),
    }));
  };

  const filledDisplayFields = displayFields.filter((f) => {
    const val = info[f.key];
    return typeof val === "string" && val.trim();
  });

  const statusVariant =
    info.status?.toLowerCase() === "vigente" ? "success" : info.status ? "warning" : "muted";

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-rasma-teal" />
              Información de la Fundación
            </CardTitle>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={openEdit} className="gap-1.5 text-xs">
                <Pencil className="h-3.5 w-3.5" />
                {hasAnyInfo ? "Editar" : "Configurar"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasAnyInfo ? (
            <p className="text-sm text-muted-foreground">
              No se ha configurado la información de la fundación.
              {isAdmin && ' Haga clic en "Configurar" para agregar los datos.'}
            </p>
          ) : (
            <div className="space-y-4">
              {/* Header: Name + Status */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight truncate">
                    {info.name || "Sin nombre"}
                  </h3>
                  {info.legalName && (
                    <p className="text-sm text-muted-foreground truncate">
                      {info.legalName}
                    </p>
                  )}
                </div>
                {info.status && (
                  <Badge variant={statusVariant} className="shrink-0">
                    {info.status}
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                {filledDisplayFields.map((field) => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key} className="flex items-start gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {field.label}
                        </p>
                        <p className="text-sm truncate">{info[field.key]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Board of Directors */}
              {info.boardMembers && info.boardMembers.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Directorio
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {info.boardMembers.map((member, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rasma-teal/10 text-rasma-teal shrink-0">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{member.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {member.role}
                              {member.rut && ` · ${member.rut}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => !open && setIsEditing(false)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Información de la Fundación</DialogTitle>
          </DialogHeader>

          {/* General info fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Datos generales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {infoFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key} className="text-xs">
                    {field.label}
                  </Label>
                  <Input
                    id={field.key}
                    value={formData[field.key] as string}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Board members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">Directorio</h4>
              <Button type="button" variant="outline" size="sm" onClick={addBoardMember} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </Button>
            </div>

            {formData.boardMembers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No se han agregado miembros del directorio.
              </p>
            )}

            <div className="space-y-2">
              {formData.boardMembers.map((member, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1fr_auto_auto] sm:grid-cols-[1fr_1.5fr_auto_auto] gap-2 items-end"
                >
                  <div className="space-y-1">
                    {index === 0 && <Label className="text-[11px] text-muted-foreground">Cargo</Label>}
                    <Input
                      value={member.role}
                      onChange={(e) => updateBoardMember(index, "role", e.target.value)}
                      placeholder="Presidente"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    {index === 0 && <Label className="text-[11px] text-muted-foreground">Nombre</Label>}
                    <Input
                      value={member.name}
                      onChange={(e) => updateBoardMember(index, "name", e.target.value)}
                      placeholder="Nombre completo"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    {index === 0 && <Label className="text-[11px] text-muted-foreground">RUT</Label>}
                    <Input
                      value={member.rut}
                      onChange={(e) => updateBoardMember(index, "rut", e.target.value)}
                      placeholder="12.345.678-9"
                      className="text-sm w-32"
                    />
                  </div>
                  <div className={index === 0 ? "mt-auto" : ""}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBoardMember(index)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
