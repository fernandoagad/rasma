"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ExpenseDonutProps {
  items: Array<{ label: string; amount: number; color: string }>;
}

const COLOR_MAP: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-cyan-500": "#06b6d4",
  "bg-teal-500": "#14b8a6",
  "bg-amber-500": "#f59e0b",
  "bg-lime-500": "#84cc16",
  "bg-purple-500": "#a855f7",
  "bg-gray-500": "#6b7280",
  "bg-rose-500": "#f43f5e",
  "bg-gray-400": "#9ca3af",
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { pct: number } }> }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-card border rounded-lg p-3 shadow-md text-sm">
      <p className="font-medium">{entry.name}</p>
      <p className="text-muted-foreground">${Math.round(entry.value).toLocaleString("es-CL")}</p>
      <p className="text-muted-foreground">{entry.payload.pct.toFixed(1)}%</p>
    </div>
  );
}

export function ExpenseDonutChart({ items }: ExpenseDonutProps) {
  const total = items.reduce((s, i) => s + i.amount, 0);
  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Sin datos para este período
      </p>
    );
  }

  const chartData = items
    .filter((d) => d.amount > 0)
    .map((d) => ({
      name: d.label,
      value: d.amount,
      color: COLOR_MAP[d.color] ?? "#9ca3af",
      pct: (d.amount / total) * 100,
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value: string, entry: unknown) => {
            const e = entry as { payload?: { pct?: number } };
            return (
              <span className="text-xs text-muted-foreground">
                {value} ({e.payload?.pct?.toFixed(0)}%)
              </span>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
