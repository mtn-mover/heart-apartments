/**
 * Date convention for the whole booking domain:
 * - Dates are plain strings 'YYYY-MM-DD' (no Date objects across boundaries, no TZ drift)
 * - check_out is exclusive (= departure day), like a half-open range [checkIn, checkOut)
 * - String comparison IS chronological comparison for this format
 */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Local calendar day of a Date (never toISOString on local dates — TZ shifts the day). */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

/** Date arithmetic entirely in UTC space — safe because inputs/outputs are date strings. */
export function addDaysString(s: string, days: number): string {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00Z`).getTime();
  const b = new Date(`${checkOut}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** All nights of a stay: [checkIn, checkOut) — the departure day is not a night. */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDaysString(d, 1)) {
    nights.push(d);
  }
  return nights;
}

/** First day of the month containing `s`, e.g. '2026-08-15' → '2026-08-01'. */
export function startOfMonthString(s: string): string {
  return `${s.slice(0, 7)}-01`;
}
