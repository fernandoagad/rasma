"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UI } from "@/constants/ui";
import { GraduationCap } from "lucide-react";

interface InternRow {
  id: string;
  name: string;
  email: string;
  university: string;
  program: string;
  status: string;
  startDate: string;
  endDate: string | null;
  weeklyHours: number;
  supervisorName: string | null;
  createdAt: Date;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  activo: "default",
  completado: "secondary",
  suspendido: "outline",
};

export function InternList({ interns }: { interns: InternRow[] }) {
  if (interns.length === 0) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No hay pasantes registrados.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Universidad</TableHead>
            <TableHead>Programa</TableHead>
            <TableHead>Supervisor/a</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Inicio</TableHead>
            <TableHead>Hrs/sem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interns.map((intern) => {
            const statusLabel = UI.rrhh.internStatuses[intern.status] || intern.status;
            const variant = STATUS_VARIANTS[intern.status] || "outline";

            return (
              <TableRow key={intern.id} className="cursor-pointer hover:bg-accent/50">
                <TableCell>
                  <Link
                    href={`/rrhh/pasantias/${intern.id}`}
                    className="font-medium text-rasma-dark hover:underline"
                  >
                    {intern.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{intern.email}</p>
                </TableCell>
                <TableCell className="text-sm">{intern.university}</TableCell>
                <TableCell className="text-sm">{intern.program}</TableCell>
                <TableCell className="text-sm">{intern.supervisorName || "—"}</TableCell>
                <TableCell>
                  <Badge variant={variant} className="text-xs">
                    {statusLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(intern.startDate + "T12:00:00").toLocaleDateString("es-CL")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {intern.weeklyHours}h
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
