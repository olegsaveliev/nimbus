/* Time-estimate formatting (hours) — ported from app.jsx. */

export function fmtEst(h: number | null | undefined): string | null {
  if (!h) return null;
  if (h < 1) return Math.round(h * 60) + "m";
  if (h >= 8) return (h % 8 === 0 ? h / 8 : (h / 8).toFixed(1)) + "d";
  return (Number.isInteger(h) ? h : h.toFixed(1)) + "h";
}

export const EST_OPTIONS: Array<[string, string]> = [
  ["0", "None"],
  ["0.5", "30m"],
  ["1", "1h"],
  ["2", "2h"],
  ["4", "4h"],
  ["8", "1d"],
];
