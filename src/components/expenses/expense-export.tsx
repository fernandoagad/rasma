"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export function ExpenseExport() {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [period, setPeriod] = useState<"month" | "semester" | "year">("month");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [semester, setSemester] = useState(
    new Date().getMonth() < 6 ? "1" : "2"
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ period, year });
      if (period === "month") params.set("month", month);
      if (period === "semester") params.set("semester", semester);

      const res = await fetch(`/api/expenses/export?${params.toString()}`);
      if (!res.ok) throw new Error("Error al exportar");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] || "gastos.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      alert("Error al descargar el archivo.");
    } finally {
      setDownloading(false);
    }
  };

  const periodSummary = () => {
    switch (period) {
      case "month":
        return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
      case "semester":
        return `${semester === "1" ? "1er" : "2do"} Semestre ${year}`;
      case "year":
        return `Año ${year}`;
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4 mr-2" />
        Exportar CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-rasma-teal" />
              Exportar Gastos
            </DialogTitle>
            <DialogDescription>
              Descarga un reporte CSV con todos los gastos del período
              seleccionado, incluyendo resumen y desglose por categoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Period type */}
            <div className="space-y-2">
              <Label>Tipo de período</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "month", label: "Mes" },
                    { value: "semester", label: "Semestre" },
                    { value: "year", label: "Año" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPeriod(opt.value)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      period === opt.value
                        ? "bg-rasma-dark text-rasma-lime border-rasma-dark"
                        : "bg-background hover:bg-muted border-input"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Year selector (always shown) */}
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month selector */}
            {period === "month" && (
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Semester selector */}
            {period === "semester" && (
              <div className="space-y-2">
                <Label>Semestre</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      1er Semestre (Ene – Jun)
                    </SelectItem>
                    <SelectItem value="2">
                      2do Semestre (Jul – Dic)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview of what will be exported */}
            <div className="rounded-lg border bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">
                Se exportará:
              </p>
              <p className="text-sm font-medium">{periodSummary()}</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                <li>• Todos los gastos del período</li>
                <li>• Resumen con totales y promedios</li>
                <li>• Desglose por categoría</li>
                {period !== "month" && <li>• Desglose mensual</li>}
                <li>• Estado de comprobantes</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={downloading}
            >
              Cancelar
            </Button>
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Descargar CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
