"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TherapistRow {
  id: string;
  name: string;
  appointments: number;
  completed: number;
  completionRate: number;
  noShowRate: number;
  revenue: number;
  activePatients: number;
  notesCount: number;
  notesRate: number;
  outstanding: number;
}

type SortKey = "name" | "appointments" | "completionRate" | "noShowRate" | "revenue" | "activePatients" | "notesRate" | "outstanding";

const columns: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Nombre", numeric: false },
  { key: "appointments", label: "Citas", numeric: true },
  { key: "completionRate", label: "Cumplimiento %", numeric: true },
  { key: "noShowRate", label: "No Asistio %", numeric: true },
  { key: "revenue", label: "Ingresos", numeric: true },
  { key: "outstanding", label: "Pend. Liq.", numeric: true },
  { key: "activePatients", label: "Pacientes Activos", numeric: true },
  { key: "notesRate", label: "Notas %", numeric: true },
];

function BarBg({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="relative flex items-center">
      <div
        className="absolute inset-y-0 left-0 bg-rasma-teal/15 rounded"
        style={{ width: `${pct}%` }}
      />
      <span className="relative z-10 px-1 tabular-nums">{value}</span>
    </div>
  );
}

export function TherapistDetailTable({ therapists }: { therapists: TherapistRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("appointments");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "name"); // name defaults asc, numbers default desc
    }
  };

  const sorted = useMemo(() => {
    const arr = [...therapists];
    arr.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return arr;
  }, [therapists, sortKey, sortAsc]);

  // Compute max values for bar chart proportions
  const maxValues = useMemo(() => ({
    appointments: Math.max(...therapists.map(t => t.appointments), 1),
    completionRate: 100,
    noShowRate: Math.max(...therapists.map(t => t.noShowRate), 1),
    revenue: Math.max(...therapists.map(t => t.revenue), 1),
    outstanding: Math.max(...therapists.map(t => t.outstanding), 1),
    activePatients: Math.max(...therapists.map(t => t.activePatients), 1),
    notesRate: 100,
  }), [therapists]);

  if (therapists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle por Terapeuta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sin datos para este periodo.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Detalle por Terapeuta</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === col.key ? "text-rasma-teal" : "text-muted-foreground/50"}`} />
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  <BarBg value={t.appointments} max={maxValues.appointments} />
                </TableCell>
                <TableCell>
                  <BarBg value={t.completionRate} max={maxValues.completionRate} />
                </TableCell>
                <TableCell>
                  <BarBg value={t.noShowRate} max={maxValues.noShowRate} />
                </TableCell>
                <TableCell>
                  <div className="relative flex items-center">
                    <div
                      className="absolute inset-y-0 left-0 bg-rasma-teal/15 rounded"
                      style={{ width: `${maxValues.revenue > 0 ? Math.min((t.revenue / maxValues.revenue) * 100, 100) : 0}%` }}
                    />
                    <span className="relative z-10 px-1 tabular-nums">
                      ${t.revenue.toLocaleString("es-CL")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="relative flex items-center">
                    <div
                      className="absolute inset-y-0 left-0 bg-amber-500/15 rounded"
                      style={{ width: `${maxValues.outstanding > 0 ? Math.min((t.outstanding / maxValues.outstanding) * 100, 100) : 0}%` }}
                    />
                    <span className="relative z-10 px-1 tabular-nums">
                      ${t.outstanding.toLocaleString("es-CL")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <BarBg value={t.activePatients} max={maxValues.activePatients} />
                </TableCell>
                <TableCell>
                  <BarBg value={t.notesRate} max={maxValues.notesRate} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
