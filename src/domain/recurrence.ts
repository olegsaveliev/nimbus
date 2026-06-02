/* Recurring tasks — ported from app.jsx. */
import type { Repeat, Task } from "@/types";
import { iso, startOfToday } from "./dates";

export const REPEAT_LABEL: Record<Exclude<Repeat, "none">, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
};

export function nextDueDate(repeat: Repeat | undefined, fromIso: string | null | undefined): string {
  const today = startOfToday();
  let base = fromIso ? new Date(fromIso + "T00:00:00") : new Date(today);
  if (isNaN(base.getTime()) || base < today) base = new Date(today);
  const d = new Date(base);
  if (repeat === "weekly") d.setDate(d.getDate() + 7);
  else if (repeat === "weekdays") {
    do {
      d.setDate(d.getDate() + 1);
    } while (d.getDay() === 0 || d.getDay() === 6);
  } else d.setDate(d.getDate() + 1);
  return iso(d);
}

/** A fresh copy of a recurring task for its next occurrence. */
export function recurClone(task: Task, newId: string): Task {
  return {
    ...task,
    id: newId,
    status: "todo",
    completedAt: null,
    startedAt: null,
    due: nextDueDate(task.repeat, task.due),
    comments: [],
    deps: [],
    subtasks: (task.subtasks || []).map((s) => ({ ...s, done: false })),
  };
}
