/* Reports metrics computed from REAL task data.
 * The prototype seeded a HISTORY array; here velocity / cycle time / on-time
 * are derived from tasks' completedAt, startedAt and due fields. */
import type { Category, Task } from "@/types";
import { DAY, WEEKDAY, startOfToday } from "./dates";

export interface PerDay {
  d: number;
  n: number;
  wd: string;
}
export interface CatBar {
  name: string;
  color: string;
  n: number;
}
export interface ReportMetrics {
  velocity: number;
  velDelta: number;
  cycle: number;
  cycleDelta: number;
  onTime: number;
  onTimeDelta: number;
  perDay: PerDay[];
  perDayTotal: number;
  byCat: CatBar[];
}

export function computeReports(tasks: Task[], cats: Category[]): ReportMetrics {
  const today = startOfToday();
  const daysAgo = (s: string) => Math.round((today.getTime() - new Date(s + "T00:00:00").getTime()) / DAY);
  const done = tasks.filter((t) => t.status === "done" && t.completedAt);

  const tw = done.filter((t) => {
    const a = daysAgo(t.completedAt!);
    return a >= 0 && a < 7;
  });
  const lw = done.filter((t) => {
    const a = daysAgo(t.completedAt!);
    return a >= 7 && a < 14;
  });

  const velocity = tw.length;
  const velDelta = lw.length ? Math.round(((tw.length - lw.length) / lw.length) * 100) : 0;

  const cycleOf = (t: Task): number | null => {
    if (!t.startedAt || !t.completedAt) return null;
    const c = (new Date(t.completedAt + "T00:00:00").getTime() - new Date(t.startedAt + "T00:00:00").getTime()) / DAY;
    return c >= 0 ? c : null;
  };
  const mean = (arr: Task[]) => {
    const vals = arr.map(cycleOf).filter((c): c is number => c != null);
    return vals.length ? vals.reduce((a, c) => a + c, 0) / vals.length : 0;
  };
  const cycleTw = mean(tw);
  const cycle = +cycleTw.toFixed(1);
  const cycleDelta = +(cycleTw - mean(lw)).toFixed(1); // negative = faster (good)

  const onTimeRate = (arr: Task[]) => {
    const withDue = arr.filter((t) => t.due);
    if (!withDue.length) return 0;
    const ok = withDue.filter((t) => t.completedAt! <= t.due).length;
    return Math.round((ok / withDue.length) * 100);
  };
  const onTime = onTimeRate(tw);
  const onTimeDelta = onTime - onTimeRate(lw);

  const perDay: PerDay[] = [];
  for (let d = 6; d >= 0; d--) {
    const date = new Date(today.getTime() - d * DAY);
    perDay.push({ d, n: done.filter((t) => daysAgo(t.completedAt!) === d).length, wd: WEEKDAY[date.getDay()] });
  }
  const perDayTotal = perDay.reduce((a, p) => a + p.n, 0);

  const last14 = done.filter((t) => daysAgo(t.completedAt!) < 14);
  const byCat: CatBar[] = cats.map((c) => ({
    name: c.name,
    color: c.color,
    n: last14.filter((t) => t.cat === c.name).length,
  }));

  return { velocity, velDelta, cycle, cycleDelta, onTime, onTimeDelta, perDay, perDayTotal, byCat };
}
