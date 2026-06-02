import type { Priority } from "@/types";

export const PRI_ORDER: Record<Priority, number> = { high: 0, med: 1, low: 2 };
export const PRI_CYCLE: Record<Priority, Priority> = { high: "med", med: "low", low: "high" };

export function priColor(p: Priority): string {
  return p === "high" ? "#f0506e" : p === "med" ? "#f5a623" : "#38c172";
}
