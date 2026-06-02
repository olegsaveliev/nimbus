/* Task dependencies — a task can be "blocked by" others that must finish first.
 * Ported from app.jsx (ids are strings here). */
import type { Task } from "@/types";

export function depsBlockedCount(task: Task, all: Task[]): number {
  const ids = task.deps || [];
  return ids.filter((id) => {
    const d = all.find((t) => t.id === id);
    return d && d.status !== "done";
  }).length;
}

export function dependsOn(all: Task[], fromId: string, targetId: string, seen?: Set<string>): boolean {
  const f = all.find((t) => t.id === fromId);
  if (!f || !f.deps) return false;
  seen = seen || new Set<string>();
  for (const d of f.deps) {
    if (d === targetId) return true;
    if (!seen.has(d)) {
      seen.add(d);
      if (dependsOn(all, d, targetId, seen)) return true;
    }
  }
  return false;
}

export function wouldCycle(all: Task[], taskId: string, depId: string): boolean {
  return depId === taskId || dependsOn(all, depId, taskId);
}

/** Move the given ids to the top of their own column (used when a task becomes unblocked). */
export function bumpToTop(list: Task[], ids: string[]): Task[] {
  const arr = list.slice();
  ids.forEach((id) => {
    const idx = arr.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const [item] = arr.splice(idx, 1);
    const fi = arr.findIndex((t) => t.status === item.status);
    if (fi < 0) arr.push(item);
    else arr.splice(fi, 0, item);
  });
  return arr;
}

/** Ids of tasks that depend on completedId and are now fully unblocked. */
export function newlyUnblocked(list: Task[], completedId: string): string[] {
  return list
    .filter((x) => (x.deps || []).includes(completedId) && x.status !== "done" && depsBlockedCount(x, list) === 0)
    .map((x) => x.id);
}
