"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateIntern, updateInternStatus } from "@/actions/interns";
import { InternHoursTab } from "./intern-hours-tab";
import { UI } from "@/constants/ui";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Building2,
  Clock,
  User,
  FileText,
} from "lucide-react";

interface InternData {
  id: string;
  name: string;
  email: string;
  phone: string;
  university: string;
  program: string;
  status: string;
  startDate: string;
  endDate: string | null;
  weeklyHours: number;
  notes: string | null;
  supervisor: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    specialty: string | null;
  };
  applicant: {
    id: string;
    name: string;
    positions: string;
    status: string;
  };
  hours: Array<{
    id: string;
    date: string;
    minutes: number;
    description: string;
    loggedBy: string;
    loggerName: string | null;
    createdAt: Date;
  }>;
}

interface HoursSummary {
  totalMinutes: number;
  totalEntries: number;
  thisMonthMinutes: number;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  activo: "default",
  completado: "secondary",
  suspendido: "outline",
};

export function InternDetail({
  intern,
  hoursSummary,
}: {
  intern: InternData;
  hoursSummary: HoursSummary | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(intern.notes || "");
  const [notesSaved, setNotesSaved] = useState(false);

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      await updateInternStatus(intern.id, newStatus);
      router.refresh();
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateIntern(intern.id, { notes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
      router.refresh();
    });
  }

  const statusLabel = UI.rrhh.internStatuses[intern.status] || intern.status;
  const statusVariant = STATUS_VARIANTS[intern.status] || "outline";
  const supervisorInitials = intern.supervisor.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/rrhh/pasantias"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-rasma-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a pasantías
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-rasma-dark">{intern.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {intern.university} — {intern.program}
          </p>
        </div>
        <Badge variant={statusVariant} className="text-sm w-fit">
          {statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contact info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${intern.email}`} className="text-rasma-teal hover:underline truncate">
                  {intern.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{intern.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{intern.university}</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{intern.program}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>
                  {new Date(intern.startDate + "T12:00:00").toLocaleDateString("es-CL")}
                  {intern.endDate && ` — ${new Date(intern.endDate + "T12:00:00").toLocaleDateString("es-CL")}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{intern.weeklyHours} horas semanales</span>
              </div>

              {/* Status */}
              <div className="pt-2 border-t space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <Select value={intern.status} onValueChange={handleStatusChange} disabled={isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UI.rrhh.internStatuses).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Supervisor card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Supervisor/a
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {intern.supervisor.image && <AvatarImage src={intern.supervisor.image} />}
                  <AvatarFallback className="text-xs">{supervisorInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{intern.supervisor.name}</p>
                  {intern.supervisor.specialty && (
                    <p className="text-xs text-muted-foreground">{intern.supervisor.specialty}</p>
                  )}
                  <a href={`mailto:${intern.supervisor.email}`} className="text-xs text-rasma-teal hover:underline">
                    {intern.supervisor.email}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applicant link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Postulación original
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/rrhh/postulantes/${intern.applicant.id}`}
                className="text-sm text-rasma-teal hover:underline"
              >
                Ver postulación de {intern.applicant.name}
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="hours">
            <TabsList className="mb-4">
              <TabsTrigger value="hours">Horas</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
            </TabsList>

            <TabsContent value="hours">
              <InternHoursTab
                internId={intern.id}
                hours={intern.hours}
                summary={hoursSummary}
                isActive={intern.status === "activo"}
              />
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <Textarea
                    placeholder="Notas sobre el pasante (rendimiento, observaciones, etc.)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isPending || notes === (intern.notes || "")}
                    >
                      Guardar notas
                    </Button>
                    {notesSaved && (
                      <span className="text-xs text-green-600">Guardado</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
