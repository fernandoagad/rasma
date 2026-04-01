/**
 * Chile timezone utilities.
 * All appointments in this app are in America/Santiago timezone.
 * This module ensures correct handling regardless of server/client timezone.
 */

export const CHILE_TZ = "America/Santiago";

const dtfParts = new Intl.DateTimeFormat("en-US", {
  timeZone: CHILE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function getPart(parts: Intl.DateTimeFormatPart[], type: string): number {
  const val = parts.find((p) => p.type === type)?.value || "0";
  return Number(val);
}

/**
 * Parse a naive datetime string (e.g. "2024-03-31T10:00") as Chile local time
 * and return a Date with the correct UTC timestamp.
 */
export function parseChileDateTime(naive: string): Date {
  const normalized = naive.includes("T") ? naive : naive + "T00:00";
  const hasSeconds = normalized.split("T")[1].split(":").length >= 3;
  const withSeconds = hasSeconds ? normalized : normalized + ":00";
  const asUTC = new Date(withSeconds + "Z");

  if (isNaN(asUTC.getTime())) return new Date(naive);

  const parts = dtfParts.formatToParts(asUTC);
  const h = getPart(parts, "hour");
  const chileMs = Date.UTC(
    getPart(parts, "year"),
    getPart(parts, "month") - 1,
    getPart(parts, "day"),
    h === 24 ? 0 : h,
    getPart(parts, "minute"),
    getPart(parts, "second"),
  );

  const offsetMs = asUTC.getTime() - chileMs;
  return new Date(asUTC.getTime() + offsetMs);
}

/** Format a Date as HH:MM in Chile timezone. */
export function formatChileTime(date: Date): string {
  return date.toLocaleTimeString("es-CL", {
    timeZone: CHILE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format a Date as a localized date string in Chile timezone. */
export function formatChileDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleDateString("es-CL", {
    timeZone: CHILE_TZ,
    ...options,
  });
}

/** Get the hour (0-23) in Chile timezone. */
export function getChileHour(date: Date): number {
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CHILE_TZ,
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .find((p) => p.type === "hour")?.value || "0",
  );
  return h === 24 ? 0 : h;
}

/** Get Chile-local date parts. */
export function getChileDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: getPart(parts, "year"),
    month: getPart(parts, "month"),
    day: getPart(parts, "day"),
  };
}

/** Check if two dates are the same day in Chile timezone. */
export function isSameDayChile(a: Date, b: Date): boolean {
  const ap = getChileDateParts(a);
  const bp = getChileDateParts(b);
  return ap.year === bp.year && ap.month === bp.month && ap.day === bp.day;
}

/** Get Chile-local minutes from midnight (for positioning in calendar). */
export function getChileMinutesFromMidnight(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = getPart(parts, "hour");
  const m = getPart(parts, "minute");
  return (h === 24 ? 0 : h) * 60 + m;
}
