"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const PERIOD_TYPES = [
  { value: "month", label: "Mes" },
  { value: "quarter", label: "Trimestre" },
  { value: "semester", label: "Semestre" },
  { value: "year", label: "Año" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const periodType = searchParams.get("period") || "month";
  const year = Number(searchParams.get("year")) || CURRENT_YEAR;
  const value = Number(searchParams.get("value")) || new Date().getMonth() + 1;

  function update(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      params.set(key, val);
    }
    router.push(`/finanzas?${params.toString()}`);
  }

  function handlePeriodChange(newPeriod: string) {
    const now = new Date();
    let newValue = "1";
    if (newPeriod === "month") newValue = String(now.getMonth() + 1);
    else if (newPeriod === "quarter") newValue = String(Math.ceil((now.getMonth() + 1) / 3));
    else if (newPeriod === "semester") newValue = now.getMonth() < 6 ? "1" : "2";
    update({ period: newPeriod, value: newValue });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period type selector */}
      <div className="flex rounded-lg border overflow-hidden">
        {PERIOD_TYPES.map((pt) => (
          <button
            key={pt.value}
            onClick={() => handlePeriodChange(pt.value)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              periodType === pt.value
                ? "bg-rasma-dark text-rasma-lime"
                : "bg-white text-rasma-dark hover:bg-muted"
            }`}
          >
            {pt.label}
          </button>
        ))}
      </div>

      {/* Year selector */}
      <select
        value={year}
        onChange={(e) => update({ year: e.target.value })}
        className="text-sm border rounded-lg px-2.5 py-1.5 bg-white text-rasma-dark focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {/* Value selector (depends on period type) */}
      {periodType === "month" && (
        <select
          value={value}
          onChange={(e) => update({ value: e.target.value })}
          className="text-sm border rounded-lg px-2.5 py-1.5 bg-white text-rasma-dark focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i + 1}>{name}</option>
          ))}
        </select>
      )}

      {periodType === "quarter" && (
        <select
          value={value}
          onChange={(e) => update({ value: e.target.value })}
          className="text-sm border rounded-lg px-2.5 py-1.5 bg-white text-rasma-dark focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
        >
          <option value="1">1° Trimestre (Ene - Mar)</option>
          <option value="2">2° Trimestre (Abr - Jun)</option>
          <option value="3">3° Trimestre (Jul - Sep)</option>
          <option value="4">4° Trimestre (Oct - Dic)</option>
        </select>
      )}

      {periodType === "semester" && (
        <select
          value={value}
          onChange={(e) => update({ value: e.target.value })}
          className="text-sm border rounded-lg px-2.5 py-1.5 bg-white text-rasma-dark focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
        >
          <option value="1">1er Semestre (Ene - Jun)</option>
          <option value="2">2do Semestre (Jul - Dic)</option>
        </select>
      )}
    </div>
  );
}
