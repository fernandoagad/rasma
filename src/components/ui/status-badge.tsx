import { Badge } from "@/components/ui/badge";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info" | "muted" | "lime" | "teal";

const statusConfig: Record<string, Record<string, { variant: BadgeVariant; label: string }>> = {
  patient: {
    activo: { variant: "success", label: "Activo" },
    inactivo: { variant: "muted", label: "Inactivo" },
    alta: { variant: "info", label: "Alta" },
  },
  appointment: {
    programada: { variant: "info", label: "Programada" },
    completada: { variant: "success", label: "Completada" },
    cancelada: { variant: "destructive", label: "Cancelada" },
    no_asistio: { variant: "warning", label: "No asistió" },
  },
  payment: {
    pendiente: { variant: "warning", label: "Pendiente" },
    pagado: { variant: "success", label: "Pagado" },
    parcial: { variant: "info", label: "Parcial" },
    cancelado: { variant: "destructive", label: "Cancelado" },
  },
  plan: {
    activo: { variant: "success", label: "Activo" },
    completado: { variant: "info", label: "Completado" },
    suspendido: { variant: "warning", label: "Suspendido" },
  },
  payout: {
    pendiente: { variant: "warning", label: "Pendiente" },
    procesado: { variant: "info", label: "Procesado" },
    pagado: { variant: "success", label: "Pagado" },
  },
  funding_source: {
    paciente: { variant: "outline", label: "Paciente" },
    fundacion: { variant: "teal", label: "Fundación" },
  },
  user: {
    evaluando: { variant: "warning", label: "Evaluando" },
    disponible: { variant: "success", label: "Disponible" },
    completo: { variant: "muted", label: "Completo" },
  },
  expense_category: {
    arriendo: { variant: "default", label: "Arriendo" },
    servicios_basicos: { variant: "info", label: "Servicios Básicos" },
    suministros: { variant: "teal", label: "Suministros" },
    mantenimiento: { variant: "warning", label: "Mantenimiento" },
    seguros: { variant: "lime", label: "Seguros" },
    marketing: { variant: "secondary", label: "Marketing" },
    software: { variant: "muted", label: "Software" },
    personal: { variant: "default", label: "Personal" },
    otros: { variant: "outline", label: "Otros" },
  },
  income_category: {
    donacion: { variant: "success", label: "Donación" },
    subvencion: { variant: "info", label: "Subvención" },
    patrocinio: { variant: "teal", label: "Patrocinio" },
    evento_benefico: { variant: "lime", label: "Evento Benéfico" },
    convenio: { variant: "warning", label: "Convenio" },
    otro_ingreso: { variant: "outline", label: "Otro Ingreso" },
  },
  role: {
    admin: { variant: "default", label: "Administrador" },
    terapeuta: { variant: "teal", label: "Terapeuta" },
    recepcionista: { variant: "lime", label: "Recepcionista" },
    supervisor: { variant: "info", label: "Supervisor" },
  },
  area: {
    "Clínica": { variant: "warning", label: "Clínica" },
    "Salud Mental": { variant: "lime", label: "Salud Mental" },
    "Atención Directa": { variant: "default", label: "Atención Directa" },
    "Neurodesarrollo": { variant: "default", label: "Neurodesarrollo" },
    "Lenguaje": { variant: "default", label: "Lenguaje" },
    "Product": { variant: "default", label: "Product" },
  },
};

interface StatusBadgeProps {
  type: keyof typeof statusConfig;
  status: string;
  className?: string;
}

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  const config = statusConfig[type]?.[status];
  if (!config) {
    return <Badge variant="outline" className={className}>{status}</Badge>;
  }
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}
