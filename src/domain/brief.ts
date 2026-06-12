/* Daily standup and Weekly Review briefs — ported from app.jsx.
 * The prototype derived "shipped" from a seeded HISTORY array; here it is computed
 * from real completedAt data. */
import type { Task } from "@/types";
import { DAY, fmtDue, startOfToday, todayIso } from "./dates";
import { depsBlockedCount } from "./deps";
import { PRI_ORDER } from "./priority";

export type BriefMode = "daily" | "review";

export interface BriefGroup {
  key: string;
  label: string;
  color: string;
  items: Task[];
}
export interface BriefStat {
  v: number;
  l: string;
  warn?: boolean;
}
export interface BriefData {
  groups: BriefGroup[];
  empty?: boolean;
  stats?: BriefStat[];
  shipped?: number;
  open?: number;
  overdue?: number;
}

export function buildBrief(tasks: Task[], mode: BriefMode): BriefData {
  const ti = todayIso();
  const today = startOfToday();
  const open = tasks.filter((t) => t.status !== "done");
  const sortP = (arr: Task[]) =>
    [...arr].sort((a, b) => PRI_ORDER[a.pri] - PRI_ORDER[b.pri] || (a.due || "9999").localeCompare(b.due || "9999"));
  const overdue = sortP(open.filter((t) => t.due && t.due < ti));

  if (mode === "review") {
    const doneWeek = tasks.filter(
      (t) => t.status === "done" && t.completedAt && (today.getTime() - new Date(t.completedAt + "T00:00:00").getTime()) / DAY < 7,
    );
    return {
      stats: [
        { v: doneWeek.length, l: "Shipped" },
        { v: open.length, l: "Still open" },
        { v: overdue.length, l: "Overdue", warn: overdue.length > 0 },
      ],
      groups: [
        { key: "ship", label: "Shipped this week", color: "#38c172", items: doneWeek },
        { key: "slip", label: "Slipped — overdue", color: "#f0506e", items: overdue },
      ].filter((g) => g.items.length),
      empty: false,
      shipped: doneWeek.length,
      open: open.length,
      overdue: overdue.length,
    };
  }

  const overIds = new Set(overdue.map((t) => t.id));
  const dueToday = sortP(open.filter((t) => t.due === ti && !overIds.has(t.id)));
  const skip = new Set([...overIds, ...dueToday.map((t) => t.id)]);
  const inProg = sortP(tasks.filter((t) => t.status === "doing" && !skip.has(t.id)));
  inProg.forEach((t) => skip.add(t.id));
  const startNext = sortP(
    tasks.filter((t) => t.status === "todo" && !skip.has(t.id) && depsBlockedCount(t, tasks) === 0),
  ).slice(0, 3);
  return {
    groups: [
      { key: "over", label: "Overdue", color: "#f0506e", items: overdue },
      { key: "today", label: "Due today", color: "#f5a623", items: dueToday },
      { key: "prog", label: "Finish in progress", color: "var(--accent)", items: inProg },
      { key: "next", label: "Start next", color: "#38c172", items: startNext },
    ].filter((g) => g.items.length),
    empty: overdue.length + dueToday.length + inProg.length + startNext.length === 0,
  };
}

export function briefPrompt(tasks: Task[], mode: BriefMode): string {
  const b = buildBrief(tasks, mode);
  if (mode === "review") {
    const ship = (b.groups.find((g) => g.key === "ship") || { items: [] }).items;
    const slip = (b.groups.find((g) => g.key === "slip") || { items: [] }).items;
    return `You are a thoughtful team lead writing a WEEKLY REVIEW. In 3-4 sentences (~70 words): celebrate what shipped, note what slipped and a likely reason, then give 2-3 concrete focus suggestions for next week. Data: shipped this week=${b.shipped} (${ship.map((t) => t.text).join("; ") || "none logged"}), still open=${b.open}, slipped/overdue=${slip.map((t) => t.text).join("; ") || "none"}. Warm but useful. No preamble, no markdown.`;
  }
  const data: Record<string, string[]> = {};
  b.groups.forEach((g) => (data[g.label] = g.items.map((t) => `${t.text} (${t.pri}${t.cat ? ", " + t.cat : ""})`)));
  return `You are an upbeat, sharp productivity coach writing a person's DAILY standup brief from their task board. Write 2-3 short sentences (max ~55 words), natural and motivating. Lead with the single most urgent thing, then what to focus on. Synthesize — do NOT just list tasks. No greeting like "Hi", no preamble, no markdown. Board:\n${JSON.stringify(data, null, 0)}`;
}

export function fallbackNarrative(tasks: Task[], mode: BriefMode): string {
  const b = buildBrief(tasks, mode);
  if (mode === "review") {
    const shipped = b.shipped || 0;
    const open = b.open || 0;
    const overdue = b.overdue || 0;
    return `You shipped ${shipped} task${shipped === 1 ? "" : "s"} this week with ${open} still open${overdue ? ` and ${overdue} overdue` : ""}. ${overdue ? "Reschedule or drop what slipped, then" : "Solid week —"} pick your top 2-3 priorities for next week and protect time for them.`;
  }
  if (b.empty) return "Board's clear — nothing overdue or due today. A great moment to pull something forward or take a breath.";
  const g = Object.fromEntries(b.groups.map((x) => [x.key, x.items]));
  const bits: string[] = [];
  if (g.over) bits.push(`${g.over.length} task${g.over.length > 1 ? "s" : ""} overdue — clear ${g.over.length > 1 ? "these" : '"' + g.over[0].text + '"'} first`);
  if (g.today) bits.push(`${g.today.length} due today`);
  if (g.prog) bits.push(`${g.prog.length} in progress to finish`);
  let s = bits.length ? `Focus: ${bits.join(", ")}.` : "";
  if (g.next && g.next[0]) s += ` Then start "${g.next[0].text}".`;
  return s.trim();
}

export function briefPlainText(tasks: Task[], mode: BriefMode): string {
  const b = buildBrief(tasks, mode);
  const lines = [mode === "review" ? "WEEKLY REVIEW" : "DAILY BRIEF", ""];
  if (mode === "review" && b.stats) lines.push(b.stats.map((s) => `${s.v} ${s.l}`).join("  ·  "), "");
  b.groups.forEach((g) => {
    lines.push(g.label.toUpperCase());
    g.items.forEach((t) => lines.push(`  • ${t.text}${t.due ? " (" + (fmtDue(t.due)?.label || t.due) + ")" : ""} [${t.pri}]`));
    lines.push("");
  });
  return lines.join("\n").trim();
}
