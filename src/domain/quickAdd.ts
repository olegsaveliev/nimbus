/* Natural-language quick-add: "Email Maya tomorrow #Work !high" — ported from app.jsx. */
import type { Category, Priority } from "@/types";
import { DAY, iso, startOfToday } from "./dates";

const WD_NAMES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

export interface QuickAddResult {
  text: string;
  pri: Priority | null;
  cat: string | null;
  due: string | null;
}

export function parseQuickAdd(raw: string, cats: Category[]): QuickAddResult {
  const today = startOfToday();
  let text = " " + (raw || "") + " ";
  let pri: Priority | null = null;
  let cat: string | null = null;
  let due: string | null = null;

  text = text.replace(/\s!(high|h|med|medium|m|low|l)\b/i, (_m, p: string) => {
    p = p.toLowerCase();
    pri = p[0] === "h" ? "high" : p[0] === "l" ? "low" : "med";
    return " ";
  });
  text = text.replace(/\s#([\p{L}][\p{L}\d_-]*)/u, (m, name: string) => {
    const n = name.toLowerCase();
    const f =
      (cats || []).find((c) => c.name.toLowerCase() === n) ||
      (cats || []).find((c) => c.name.toLowerCase().startsWith(n));
    if (f) {
      cat = f.name;
      return " ";
    }
    return m;
  });

  const setDue = (off: number) => {
    due = iso(new Date(today.getTime() + off * DAY));
  };
  let m: RegExpMatchArray | null;
  if ((m = text.match(/\b(today|tdy)\b/i))) {
    setDue(0);
    text = text.replace(m[0], " ");
  } else if ((m = text.match(/\b(tomorrow|tmrw|tmr|tom)\b/i))) {
    setDue(1);
    text = text.replace(m[0], " ");
  } else if ((m = text.match(/\bin\s+(\d{1,2})\s*(?:d|days?)\b/i))) {
    setDue(parseInt(m[1], 10));
    text = text.replace(m[0], " ");
  } else if ((m = text.match(/\bnext\s+week\b/i))) {
    setDue(7);
    text = text.replace(m[0], " ");
  } else if (
    (m = text.match(
      /\b(sunday|saturday|monday|tuesday|wednesday|thursday|friday|sun|mon|tues|tue|weds|wed|thurs|thur|thu|fri|sat)\b/i,
    ))
  ) {
    const tgt = WD_NAMES[m[1].toLowerCase()];
    const diff = (tgt - today.getDay() + 7) % 7;
    setDue(diff);
    text = text.replace(m[0], " ");
  }
  text = text.replace(/\s+/g, " ").trim();
  return { text, pri, cat, due };
}
