import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { and, gte, lte, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { UI } from "@/constants/ui";

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

const pad = (n: number) => String(n).padStart(2, "0");

function escapeCsv(val: string | null | undefined): string {
  if (!val) return "";
  return `"${val.replace(/"/g, '""')}"`;
}

function computeDateRange(
  period: string,
  year: number,
  month: number,
  semester: number
): { dateFrom: string; dateTo: string; periodLabel: string } {
  switch (period) {
    case "semester": {
      const startMonth = semester === 1 ? 1 : 7;
      const endMonth = semester === 1 ? 6 : 12;
      const lastDay = new Date(year, endMonth, 0).getDate();
      return {
        dateFrom: `${year}-${pad(startMonth)}-01`,
        dateTo: `${year}-${pad(endMonth)}-${pad(lastDay)}`,
        periodLabel: `${semester === 1 ? "1er" : "2do"} Semestre ${year}`,
      };
    }
    case "year":
      return {
        dateFrom: `${year}-01-01`,
        dateTo: `${year}-12-31`,
        periodLabel: `Año ${year}`,
      };
    default: {
      const lastDay = new Date(year, month, 0).getDate();
      return {
        dateFrom: `${year}-${pad(month)}-01`,
        dateTo: `${year}-${pad(month)}-${pad(lastDay)}`,
        periodLabel: `${MONTH_NAMES[month - 1]} ${year}`,
      };
    }
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "supervisor"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "month";
  const year =
    Number(url.searchParams.get("year")) || new Date().getFullYear();
  const month =
    Number(url.searchParams.get("month")) || new Date().getMonth() + 1;
  const semester =
    Number(url.searchParams.get("semester")) ||
    (new Date().getMonth() < 6 ? 1 : 2);

  const { dateFrom, dateTo, periodLabel } = computeDateRange(
    period,
    year,
    month,
    semester
  );

  const data = await db.query.expenses.findMany({
    where: and(gte(expenses.date, dateFrom), lte(expenses.date, dateTo)),
    with: { creator: { columns: { id: true, name: true } } },
    orderBy: [desc(expenses.date)],
  });

  const categoryLabels = UI.expenses.categories;

  // -- Aggregate metrics --
  let totalAmount = 0;
  let withReceipt = 0;
  const categoryTotals: Record<string, { count: number; amount: number }> = {};
  const monthlyTotals: Record<string, { count: number; amount: number }> = {};

  for (const e of data) {
    const amt = e.amount / 100;
    totalAmount += amt;

    if (e.receiptDriveFileId) withReceipt++;

    if (!categoryTotals[e.category])
      categoryTotals[e.category] = { count: 0, amount: 0 };
    categoryTotals[e.category].count++;
    categoryTotals[e.category].amount += amt;

    const monthKey = e.date.substring(0, 7);
    if (!monthlyTotals[monthKey])
      monthlyTotals[monthKey] = { count: 0, amount: 0 };
    monthlyTotals[monthKey].count++;
    monthlyTotals[monthKey].amount += amt;
  }

  // -- Build CSV rows --
  const BOM = "\uFEFF";
  const rows: string[] = [];

  // Header block
  rows.push('"FUNDACIÓN RASMA - Reporte de Gastos"');
  rows.push(`"Período: ${periodLabel}"`);
  rows.push(
    `"Generado: ${new Date().toLocaleDateString("es-CL")} ${new Date().toLocaleTimeString("es-CL")}"`
  );
  rows.push(`"Rango: ${dateFrom} al ${dateTo}"`);
  rows.push("");

  // Column headers
  rows.push(
    "N°,Fecha,Descripción,Categoría,Monto ($),Creado por,Comprobante,Notas"
  );

  // Data rows
  data.forEach((e, i) => {
    rows.push(
      [
        i + 1,
        e.date,
        escapeCsv(e.description),
        escapeCsv(categoryLabels[e.category] || e.category),
        (e.amount / 100).toLocaleString("es-CL"),
        escapeCsv(e.creator?.name || ""),
        e.receiptDriveFileId ? "Sí" : "No",
        escapeCsv(e.notes),
      ].join(",")
    );
  });

  // ═══ SUMMARY SECTION ═══
  rows.push("");
  rows.push("");
  rows.push(`"═══════════════════════════════════════════════════"`);
  rows.push(`"RESUMEN DEL PERÍODO: ${periodLabel}"`);
  rows.push(`"═══════════════════════════════════════════════════"`);
  rows.push("");
  rows.push(`"Total de gastos:",,,,${totalAmount.toLocaleString("es-CL")}`);
  rows.push(`"Cantidad de registros:",,,,"${data.length}"`);
  rows.push(
    `"Promedio por gasto:",,,,${data.length > 0 ? Math.round(totalAmount / data.length).toLocaleString("es-CL") : 0}`
  );

  if (data.length > 0) {
    const amounts = data.map((e) => e.amount / 100);
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    const maxExpense = data.find((e) => e.amount / 100 === maxAmount);
    const minExpense = data.find((e) => e.amount / 100 === minAmount);
    rows.push(
      `"Gasto mayor:",,"${maxExpense?.description || ""}",,${maxAmount.toLocaleString("es-CL")}`
    );
    rows.push(
      `"Gasto menor:",,"${minExpense?.description || ""}",,${minAmount.toLocaleString("es-CL")}`
    );
  }

  // Receipt compliance
  rows.push("");
  rows.push(`"CUMPLIMIENTO DE COMPROBANTES"`);
  rows.push(
    `"Con comprobante:",,"${withReceipt} de ${data.length}",,"${data.length > 0 ? ((withReceipt / data.length) * 100).toFixed(1) : 0}%"`
  );
  rows.push(
    `"Sin comprobante:",,"${data.length - withReceipt} de ${data.length}",,"${data.length > 0 ? (((data.length - withReceipt) / data.length) * 100).toFixed(1) : 0}%"`
  );

  // ═══ CATEGORY BREAKDOWN ═══
  rows.push("");
  rows.push(`"DESGLOSE POR CATEGORÍA"`);
  rows.push("Categoría,Cantidad,Monto ($),% del Total");

  const sortedCategories = Object.entries(categoryTotals).sort(
    (a, b) => b[1].amount - a[1].amount
  );
  for (const [cat, info] of sortedCategories) {
    const pct =
      totalAmount > 0
        ? ((info.amount / totalAmount) * 100).toFixed(1)
        : "0.0";
    rows.push(
      `"${categoryLabels[cat] || cat}",${info.count},${info.amount.toLocaleString("es-CL")},${pct}%`
    );
  }

  // ═══ MONTHLY BREAKDOWN (for semester / year) ═══
  if (period !== "month") {
    rows.push("");
    rows.push(`"DESGLOSE MENSUAL"`);
    rows.push("Mes,Cantidad,Monto ($),% del Total");

    const sortedMonths = Object.entries(monthlyTotals).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const [monthKey, info] of sortedMonths) {
      const [, m] = monthKey.split("-");
      const pct =
        totalAmount > 0
          ? ((info.amount / totalAmount) * 100).toFixed(1)
          : "0.0";
      rows.push(
        `"${MONTH_NAMES[Number(m) - 1]} ${year}",${info.count},${info.amount.toLocaleString("es-CL")},${pct}%`
      );
    }
  }

  rows.push("");
  rows.push(
    `"Reporte generado automáticamente por RASMA · ${new Date().toLocaleDateString("es-CL")}"`
  );

  const csv = BOM + rows.join("\n");
  const filename = `gastos-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
