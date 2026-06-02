/* Current daily-completion streak (consecutive days ending today). Ported from app.jsx. */
import type { Task } from "@/types";
import { iso, startOfToday } from "./dates";

export function currentStreak(tasks: Task[]): number {
  const days = new Set(tasks.filter((t) => t.completedAt).map((t) => t.completedAt as string));
  if (!days.size) return 0;
  let streak = 0;
  const d = startOfToday();
  while (days.has(iso(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
