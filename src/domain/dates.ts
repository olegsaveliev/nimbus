/* Date helpers — ported from app.jsx. */

export const DAY = 86400000;

/** Midnight today, recomputed per call so long-lived sessions stay correct. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local-date ISO (YYYY-MM-DD), timezone-safe. */
export function iso(d: Date): string {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return iso(startOfToday());
}

export interface DueLabel {
  label: string;
  over: boolean;
}

export function fmtDue(s: string | null | undefined): DueLabel | null {
  if (!s) return null;
  const today = startOfToday();
  const d = new Date(s + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / DAY);
  if (diff === 0) return { label: "Today", over: false };
  if (diff === 1) return { label: "Tomorrow", over: false };
  if (diff === -1) return { label: "Yesterday", over: true };
  if (diff < 0) return { label: Math.abs(diff) + "d ago", over: true };
  if (diff < 7) return { label: "In " + diff + "d", over: false };
  return { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), over: false };
}

export const WEEKDAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
