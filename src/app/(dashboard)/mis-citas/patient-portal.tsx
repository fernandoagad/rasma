"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  Calendar,
  CalendarPlus,
  Clock,
  Video,
  MapPin,
  Users2,
  ExternalLink,
  CreditCard,
  FileText,
  Download,
  Eye,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CancelAppointmentButton } from "./cancel-button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Appointment {
  id: string;
  dateTime: string;
  durationMinutes: number;
  status: string;
  sessionType: string;
  modality: string | null;
  meetingLink: string | null;
  notes: string | null;
  price: number | null;
  createdAt: string;
  updatedAt: string;
  therapist: {
    id: string;
    name: string;
    specialty: string | null;
    image: string | null;
  };
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  date: string;
  receiptNumber: string | null;
  fundingSource: string;
  createdAt: string;
  appointment: {
    dateTime: string;
    sessionType: string;
    therapist: { name: string } | null;
  } | null;
}

interface Document {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  driveViewLink: string | null;
  driveDownloadLink: string | null;
  category: string;
  label: string | null;
  createdAt: string;
  uploader: { name: string };
}

interface Professional {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    specialty: string | null;
    image: string | null;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusVariant: Record<string, "info" | "success" | "destructive" | "warning"> = {
  programada: "info",
  completada: "success",
  cancelada: "destructive",
  no_asistio: "warning",
};

const statusLabel: Record<string, string> = {
  programada: "Programada",
  completada: "Completada",
  cancelada: "Cancelada",
  no_asistio: "No asistio",
};

const payStatusLabel: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  parcial: "Parcial",
  cancelado: "Cancelado",
};

const payMethodLabel: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  mercadopago: "MercadoPago",
  otro: "Otro",
};

const docCategoryLabel: Record<string, string> = {
  general: "General",
  evaluacion: "Evaluacion",
  informe: "Informe",
  consentimiento: "Consentimiento",
  otro: "Otro",
};

function formatDateSpanish(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatShortDate(dateStr: string): string {
  // Handles both ISO dates and "YYYY-MM-DD"
  const d = dateStr.includes("T") ? new Date(dateStr) : new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCLP(cents: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "citas", label: "Mis Citas", icon: Calendar },
  { id: "pagos", label: "Pagos", icon: CreditCard },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "equipo", label: "Mi Equipo", icon: Users2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function PatientPortal({
  userName,
  appointments,
  professionals,
  payments,
  documents,
}: {
  userName: string;
  appointments: Appointment[];
  professionals: Professional[];
  payments: Payment[];
  documents: Document[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("citas");
  const now = new Date();

  const upcomingAppts = appointments.filter(
    (a) => a.status === "programada" && new Date(a.dateTime) > now
  );
  const pastAppts = appointments.filter(
    (a) => a.status !== "programada" || new Date(a.dateTime) <= now
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-rasma-dark tracking-tight">
            Hola, {userName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tus citas, pagos, documentos y equipo profesional
          </p>
        </div>
        <Link href="/mis-citas/agendar">
          <Button className="h-11 px-5 text-base font-semibold rounded-xl gap-2 bg-blue-600 text-white hover:bg-blue-700">
            <CalendarPlus className="h-5 w-5" />
            Agendar cita
          </Button>
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          let count = 0;
          if (tab.id === "citas") count = upcomingAppts.length;
          if (tab.id === "pagos") count = payments.filter((p) => p.status === "pendiente").length;
          if (tab.id === "documentos") count = documents.length;
          if (tab.id === "equipo") count = professionals.length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-1 justify-center",
                isActive
                  ? "bg-white text-rasma-dark shadow-sm"
                  : "text-zinc-500 hover:text-rasma-dark",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span className={cn(
                  "text-[11px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1",
                  isActive ? "bg-blue-100 text-blue-700" : "bg-zinc-200 text-zinc-600",
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "citas" && (
        <CitasTab upcomingAppts={upcomingAppts} pastAppts={pastAppts} now={now} />
      )}
      {activeTab === "pagos" && <PagosTab payments={payments} />}
      {activeTab === "documentos" && <DocumentosTab documents={documents} />}
      {activeTab === "equipo" && <EquipoTab professionals={professionals} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Citas Tab                                                          */
/* ------------------------------------------------------------------ */

function CitasTab({
  upcomingAppts,
  pastAppts,
  now,
}: {
  upcomingAppts: Appointment[];
  pastAppts: Appointment[];
  now: Date;
}) {
  return (
    <div className="space-y-6">
      {/* Upcoming */}
      {upcomingAppts.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-rasma-dark uppercase tracking-wider mb-3">
            Proximas citas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingAppts.map((apt) => {
              const dateTime = new Date(apt.dateTime);
              const isWithin2Hours =
                dateTime.getTime() - now.getTime() <= 2 * 60 * 60 * 1000 &&
                dateTime.getTime() > now.getTime();
              const showMeetingLink =
                apt.modality === "online" && isWithin2Hours && apt.meetingLink;

              return (
                <Card key={apt.id} className="rounded-xl border-blue-200 bg-blue-50/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-rasma-dark capitalize">
                          {formatDateSpanish(apt.dateTime)}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(apt.dateTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            {apt.modality === "online" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                            {apt.modality === "online" ? "Online" : "Presencial"}
                          </span>
                        </div>
                      </div>
                      <Badge variant="info">Programada</Badge>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <AvatarInitials name={apt.therapist.name} image={apt.therapist.image} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-rasma-dark truncate">{apt.therapist.name}</p>
                        {apt.therapist.specialty && (
                          <p className="text-xs text-muted-foreground truncate">{apt.therapist.specialty}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {showMeetingLink && (
                        <a
                          href={apt.meetingLink!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
                        >
                          <Video className="h-4 w-4" />
                          Unirse
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <CancelAppointmentButton appointmentId={apt.id} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Past sessions */}
      <div>
        <h2 className="text-sm font-bold text-rasma-dark uppercase tracking-wider mb-3">
          Historial de sesiones
        </h2>
        {pastAppts.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-10 text-center">
              <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-zinc-300" />
              </div>
              <p className="text-sm font-medium text-rasma-dark">Sin historial</p>
              <p className="text-xs text-muted-foreground mt-1">Las sesiones completadas apareceran aqui</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl">
            <CardContent className="p-0">
              <div className="divide-y">
                {pastAppts.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarInitials name={apt.therapist.name} image={apt.therapist.image} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-rasma-dark truncate">
                          {apt.therapist.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(apt.dateTime)} · {formatTime(apt.dateTime)} · {apt.durationMinutes} min
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusVariant[apt.status] ?? "outline"} className="shrink-0">
                      {statusLabel[apt.status] ?? apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pagos Tab                                                          */
/* ------------------------------------------------------------------ */

function PagosTab({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-10 text-center">
          <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <CreditCard className="h-6 w-6 text-zinc-300" />
          </div>
          <p className="text-sm font-medium text-rasma-dark">Sin pagos registrados</p>
          <p className="text-xs text-muted-foreground mt-1">Cuando tenga pagos asociados, apareceran aqui</p>
        </CardContent>
      </Card>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "pagado")
    .reduce((sum, p) => sum + p.amount, 0);
  const pending = payments.filter((p) => p.status === "pendiente");

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total pagado</p>
            <p className="text-xl font-bold text-rasma-dark mt-1">{formatCLP(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pagos realizados</p>
            <p className="text-xl font-bold text-rasma-dark mt-1">
              {payments.filter((p) => p.status === "pagado").length}
            </p>
          </CardContent>
        </Card>
        {pending.length > 0 && (
          <Card className="rounded-xl border-amber-200 bg-amber-50/30">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pendientes</p>
              <p className="text-xl font-bold text-rasma-dark mt-1">{pending.length}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment list */}
      <Card className="rounded-xl">
        <CardContent className="p-0">
          <div className="divide-y">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                    p.status === "pagado" ? "bg-emerald-100" : p.status === "pendiente" ? "bg-amber-100" : "bg-zinc-100",
                  )}>
                    {p.status === "pagado" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : p.status === "pendiente" ? (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <DollarSign className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-rasma-dark">
                      {p.appointment?.therapist?.name
                        ? `Sesion con ${p.appointment.therapist.name}`
                        : "Pago registrado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(p.date)}
                      {p.paymentMethod && ` · ${payMethodLabel[p.paymentMethod] ?? p.paymentMethod}`}
                      {p.receiptNumber && ` · #${p.receiptNumber}`}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-rasma-dark">{formatCLP(p.amount)}</p>
                  <p className={cn(
                    "text-[11px] font-semibold",
                    p.status === "pagado" ? "text-emerald-600" : p.status === "pendiente" ? "text-amber-600" : "text-muted-foreground",
                  )}>
                    {payStatusLabel[p.status] ?? p.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Documentos Tab                                                     */
/* ------------------------------------------------------------------ */

function DocumentosTab({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-10 text-center">
          <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6 text-zinc-300" />
          </div>
          <p className="text-sm font-medium text-rasma-dark">Sin documentos</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cuando sus profesionales suban informes, certificados o evaluaciones, apareceran aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by category
  const grouped = new Map<string, Document[]>();
  for (const doc of documents) {
    const cat = doc.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(doc);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {documents.length} documento{documents.length !== 1 ? "s" : ""} disponible{documents.length !== 1 ? "s" : ""}
      </p>

      {Array.from(grouped.entries()).map(([category, docs]) => (
        <div key={category}>
          <h3 className="text-xs font-bold text-rasma-dark uppercase tracking-wider mb-2">
            {docCategoryLabel[category] ?? category}
          </h3>
          <Card className="rounded-xl">
            <CardContent className="p-0">
              <div className="divide-y">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <FileCheck className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-rasma-dark truncate">
                          {doc.label || doc.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(doc.createdAt)}
                          {" · "}Subido por {doc.uploader.name}
                          {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.driveViewLink && (
                        <a
                          href={doc.driveViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 rounded-lg border hover:bg-zinc-50 flex items-center justify-center transition-colors"
                          title="Ver documento"
                        >
                          <Eye className="h-3.5 w-3.5 text-rasma-dark" />
                        </a>
                      )}
                      {doc.driveDownloadLink && (
                        <a
                          href={doc.driveDownloadLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 rounded-lg border hover:bg-zinc-50 flex items-center justify-center transition-colors"
                          title="Descargar"
                        >
                          <Download className="h-3.5 w-3.5 text-rasma-dark" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Equipo Tab                                                         */
/* ------------------------------------------------------------------ */

function EquipoTab({ professionals }: { professionals: Professional[] }) {
  if (professionals.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-10 text-center">
          <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <Users2 className="h-6 w-6 text-zinc-300" />
          </div>
          <p className="text-sm font-medium text-rasma-dark">Sin equipo asignado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cuando le asignen profesionales, apareceran aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {professionals.map((member) => (
        <Card key={member.id} className="rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <AvatarInitials
              name={member.user.name}
              image={member.user.image}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-rasma-dark truncate">
                {member.user.name}
              </p>
              {member.user.specialty && (
                <p className="text-xs text-muted-foreground truncate">
                  {member.user.specialty}
                </p>
              )}
              <p className="text-xs text-muted-foreground truncate">
                {member.user.email}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
