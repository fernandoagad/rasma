"use client";

import dynamic from "next/dynamic";

const MonthlyTrendChart = dynamic(
  () => import("./monthly-trend-chart").then((m) => m.MonthlyTrendChart),
  { ssr: false, loading: () => <div className="h-[280px] bg-muted animate-pulse rounded-lg" /> }
);

const IncomeDonutChart = dynamic(
  () => import("./income-donut-chart").then((m) => m.IncomeDonutChart),
  { ssr: false, loading: () => <div className="h-[240px] bg-muted animate-pulse rounded-lg" /> }
);

const ExpenseDonutChart = dynamic(
  () => import("./expense-donut-chart").then((m) => m.ExpenseDonutChart),
  { ssr: false, loading: () => <div className="h-[240px] bg-muted animate-pulse rounded-lg" /> }
);

export { MonthlyTrendChart, IncomeDonutChart, ExpenseDonutChart };
