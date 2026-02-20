"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyTrendProps {
  data: Array<{
    month: string;
    label: string;
    income: number;
    expenses: number;
    net: number;
  }>;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; fill: string; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg p-3 shadow-md text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: entry.fill }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">${Math.round(entry.value).toLocaleString("es-CL")}</span>
        </div>
      ))}
    </div>
  );
}

export function MonthlyTrendChart({ data }: MonthlyTrendProps) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
        <Bar dataKey="income" name="Ingresos" fill="#37955b" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="expenses" name="Gastos" fill="#ee4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
