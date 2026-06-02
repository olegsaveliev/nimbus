/* Board model constants & lane grouping — ported from app.jsx. */
import type { Category, Column, Task } from "@/types";

export const CORE_COLUMNS: Column[] = [
  { key: "todo", name: "To Do", dot: "var(--accent)", core: true },
  { key: "doing", name: "In Progress", dot: "#f5a623", core: true },
  { key: "done", name: "Done", dot: "#38c172", core: true },
];

export const DEFAULT_CATS: Category[] = [
  { id: "c1", name: "Work", color: "#7c5cff" },
  { id: "c2", name: "Personal", color: "#ff6b9d" },
  { id: "c3", name: "Health", color: "#22d3ee" },
  { id: "c4", name: "Shopping", color: "#fb923c" },
];

export const CAT_PALETTE = ["#7c5cff", "#ff6b9d", "#22d3ee", "#38c172", "#fb923c", "#f0506e", "#f5a623", "#a78bfa"];

/* avatar color from name */
const AV_COLORS = ["#7c5cff", "#ff6b9d", "#f5a623", "#22d3ee", "#38c172", "#fb7185"];
export const avColor = (name: string): string =>
  AV_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];
export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export interface Lane {
  key: string;
  name: string;
  color: string;
  items: Task[];
}

export function lanesFor(by: "priority" | "category", tasks: Task[], cats: Category[]): Lane[] {
  if (by === "priority") {
    const defs: Array<[string, string, string]> = [
      ["high", "High", "#f0506e"],
      ["med", "Medium", "#f5a623"],
      ["low", "Low", "#38c172"],
    ];
    return defs.map(([k, n, c]) => ({ key: k, name: n, color: c, items: tasks.filter((t) => t.pri === k) }));
  }
  // category
  const lanes: Lane[] = (cats || []).map((c) => ({
    key: c.id,
    name: c.name,
    color: c.color,
    items: tasks.filter((t) => t.cat === c.name),
  }));
  const known = new Set((cats || []).map((c) => c.name));
  const other = tasks.filter((t) => !t.cat || !known.has(t.cat));
  if (other.length) lanes.push({ key: "_none", name: "No list", color: "rgba(120,90,140,0.4)", items: other });
  return lanes;
}
