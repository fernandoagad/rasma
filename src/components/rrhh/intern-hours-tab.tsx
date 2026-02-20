"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { logInternHours, deleteInternHourEntry } from "@/actions/interns";
import { Clock, Trash2, Plus } from "lucide-react";

interface HourEntry {
  id: string;
  date: string;
  minutes: number;
  description: string;
  loggedBy: string;
  loggerName: string | null;
  createdAt: Date;
}

interface HoursSummary {
  totalMinutes: number;
  totalEntries: number;
  thisMonthMinutes: number;
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function InternHoursTab({
  internId,
  hours,
  summary,
  isActive,
}: {
  internId: string;
  hours: HourEntry[];
  summary: HoursSummary | null;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hoursInput, setHoursInput] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit() {
    const numHours = parseFloat(hoursInput);
    if (!numHours || numHours <= 0 || !description.trim()) return;
    const minutes = Math.round(numHours * 60);

    startTransition(async () => {
      const result = await logInternHours(internId, { date, minutes, description: description.trim() });
      if (result.success) {
        setHoursInput("");
        setDescription("");
        router.refresh();
      }
    });
  }

  function handleDelete(hourId: string) {
    startTransition(async () => {
      await deleteInternHourEntry(hourId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-rasma-dark">{formatHours(summary.thisMonthMinutes)}</p>
              <p className="text-xs text-muted-foreground">Este mes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-rasma-dark">{formatHours(summary.totalMinutes)}</p>
              <p className="text-xs text-muted-foreground">Total acumulado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-rasma-dark">{summary.totalEntries}</p>
              <p className="text-xs text-muted-foreground">Registros</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Log hours form */}
      {isActive && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4" />
              Registrar horas
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                placeholder="Horas (ej: 2.5)"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
              />
              <Button onClick={handleSubmit} disabled={isPending || !hoursInput || !description.trim()} size="sm">
                <Clock className="h-4 w-4 mr-1" />
                Registrar
              </Button>
            </div>
            <Textarea
              placeholder="Descripción de las actividades realizadas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px]"
            />
          </CardContent>
        </Card>
      )}

      {/* Hours table */}
      {hours.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Sin horas registradas.
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Registrado por</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hours.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">
                    {new Date(entry.date + "T12:00:00").toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatHours(entry.minutes)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.loggerName || "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDelete(entry.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
