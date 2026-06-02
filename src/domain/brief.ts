/* Daily / Sprint / Recap / Triage / Insights / Review briefs — ported from app.jsx.
 * The prototype derived "velocity" from a seeded HISTORY array; here it is computed
 * from real completedAt data. */
import type { Task } from "@/types";
import { DAY, fmtDue, iso, startOfToday, todayIso } from "./dates";
import { depsBlockedCount } from "./deps";
import { PRI_ORDER } from "./priority";

export type BriefMode = "daily" | "sprint" | "recap" | "triage" | "insights" | "review";

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
  recapCount?: number;
  insight?: { wip: number; blocked: number; overdue: number; busiest: [string, number] | null };
  stats?: BriefStat[];
  atRisk?: Task[];
  velocity?: number;
  open?: number;
  overdue?: number;
  shipped?: number;
}

/** Real weekly velocity: tasks completed in the last 7 days. */
export function weeklyVelocity(tasks: Task[]): number {
  const today = startOfToday();
  return tasks.filter(
    (t) => t.status === "done" && t.completedAt && (today.getTime() - new Date(t.completedAt + "T00:00:00").getTime()) / DAY < 7,
  ).length;
}

export function buildBrief(tasks: Task[], mode: BriefMode): BriefData {
  const ti = todayIso();
  const today = startOfToday();
  const open = tasks.filter((t) => t.status !== "done");
  const sortP = (arr: Task[]) =>
    [...arr].sort((a, b) => PRI_ORDER[a.pri] - PRI_ORDER[b.pri] || (a.due || "9999").localeCompare(b.due || "9999"));
  const overdue = sortP(open.filter((t) => t.due && t.due < ti));
  const overIds = new Set(overdue.map((t) => t.id));
  const dueToday = sortP(open.filter((t) => t.due === ti && !overIds.has(t.id)));
  const skip = new Set([...overIds, ...dueToday.map((t) => t.id)]);
  const inProg = sortP(tasks.filter((t) => t.status === "doing" && !skip.has(t.id)));
  inProg.forEach((t) => skip.add(t.id));
  const startNext = sortP(
    tasks.filter((t) => t.status === "todo" && !skip.has(t.id) && depsBlockedCount(t, tasks) === 0),
  ).slice(0, 3);

  if (mode === "daily") {
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
  if (mode === "recap") {
    const doneToday = tasks.filter((t) => t.status === "done" && t.completedAt === ti);
    return {
      groups: doneToday.length ? [{ key: "done", label: "Closed today", color: "#38c172", items: doneToday }] : [],
      recapCount: doneToday.length,
      empty: doneToday.length === 0,
    };
  }
  if (mode === "triage") {
    const seen = new Set<string>();
    const take = (arr: Task[]) => {
      const r = arr.filter((t) => !seen.has(t.id));
      r.forEach((t) => seen.add(t.id));
      return r;
    };
    const od = take(sortP(open.filter((t) => t.due && t.due < ti)));
    const stalled = take(sortP(tasks.filter((t) => t.status === "doing" && (!t.due || t.due < ti))));
    const undated = take(open.filter((t) => !t.due && t.pri === "high"));
    return {
      groups: [
        { key: "od", label: "Overdue — reschedule or clear", color: "#f0506e", items: od },
        { key: "st", label: "Stalled in progress", color: "#f5a623", items: stalled },
        { key: "nd", label: "High priority, no date", color: "var(--accent)", items: undated },
      ].filter((g) => g.items.length),
      empty: od.length + stalled.length + undated.length === 0,
    };
  }
  // sprint / insights / review
  const velocity = weeklyVelocity(tasks);
  const wip = tasks.filter((t) => t.status === "doing").length;
  const atRisk = open.filter((t) => t.pri === "high" && t.due && t.due <= iso(new Date(today.getTime() + 2 * DAY)));
  const priorities = sortP(open).slice(0, 5);
  if (mode === "insights") {
    const doing = sortP(tasks.filter((t) => t.status === "doing"));
    const blocked = sortP(open.filter((t) => depsBlockedCount(t, tasks) > 0));
    const catCount: Record<string, number> = {};
    open.forEach((t) => {
      if (t.cat) catCount[t.cat] = (catCount[t.cat] || 0) + 1;
    });
    const busiest = (Object.entries(catCount).sort((a, b) => b[1] - a[1])[0] as [string, number] | undefined) || null;
    return {
      groups: [
        { key: "bk", label: "Blocked / waiting", color: "#f0506e", items: blocked },
        { key: "wip", label: "In progress right now", color: "#f5a623", items: doing },
        { key: "od", label: "Overdue", color: "#f0506e", items: overdue },
      ].filter((g) => g.items.length),
      empty: blocked.length + doing.length + overdue.length === 0,
      insight: { wip: doing.length, blocked: blocked.length, overdue: overdue.length, busiest },
    };
  }
  if (mode === "review") {
    const doneWeek = tasks.filter(
      (t) => t.status === "done" && t.completedAt && (today.getTime() - new Date(t.completedAt + "T00:00:00").getTime()) / DAY < 7,
    );
    const shipped = doneWeek.length || velocity;
    return {
      stats: [
        { v: shipped, l: "Shipped" },
        { v: open.length, l: "Still open" },
        { v: overdue.length, l: "Overdue", warn: overdue.length > 0 },
      ],
      groups: [
        { key: "ship", label: "Shipped this week", color: "#38c172", items: doneWeek },
        { key: "slip", label: "Slipped — overdue", color: "#f0506e", items: overdue },
      ].filter((g) => g.items.length),
      empty: false,
      shipped,
      open: open.length,
      overdue: overdue.length,
    };
  }
  return {
    stats: [
      { v: velocity, l: "Done / wk" },
      { v: open.length, l: "Open" },
      { v: wip, l: "In progress" },
      { v: atRisk.length, l: "At risk", warn: atRisk.length > 0 },
    ],
    groups: [{ key: "prio", label: "Sprint priorities", color: "var(--accent)", items: priorities }].filter(
      (g) => g.items.length,
    ),
    atRisk,
    velocity,
    open: open.length,
  };
}

export function briefPrompt(tasks: Task[], mode: BriefMode): string {
  const b = buildBrief(tasks, mode);
  const names = (arr: Task[]) => arr.map((t) => `${t.text} (${t.pri}${t.cat ? ", " + t.cat : ""})`);
  if (mode === "daily") {
    const data: Record<string, string[]> = {};
    b.groups.forEach((g) => (data[g.label] = names(g.items)));
    return `You are an upbeat, sharp productivity coach writing a person's DAILY standup brief from their task board. Write 2-3 short sentences (max ~55 words), natural and motivating. Lead with the single most urgent thing, then what to focus on. Synthesize — do NOT just list tasks. No greeting like "Hi", no preamble, no markdown. Board:\n${JSON.stringify(data, null, 0)}`;
  }
  if (mode === "recap") {
    const titles = b.groups[0] ? b.groups[0].items.map((t) => t.text) : [];
    return `Write a warm, short end-of-day recap (2 sentences, ~40 words) celebrating what was finished today. Closed today: ${titles.join("; ") || "nothing yet"}. Encouraging and light, no preamble, no markdown.`;
  }
  if (mode === "triage") {
    const g = Object.fromEntries(b.groups.map((x) => [x.key, x.items.map((t) => t.text)]));
    return `You are a no-nonsense triage assistant. In 2-3 sentences (~55 words) advise what to prioritize, reschedule, or drop. Overdue: ${(g.od || []).join("; ") || "none"}. Stalled in progress: ${(g.st || []).join("; ") || "none"}. High-priority undated: ${(g.nd || []).join("; ") || "none"}. No preamble, no markdown.`;
  }
  if (mode === "insights") {
    const i = b.insight || { wip: 0, blocked: 0, overdue: 0, busiest: null };
    const bk = (b.groups.find((g) => g.key === "bk") || { items: [] }).items;
    return `You are a candid productivity coach. Analyze why this board might be stuck and give 2-3 sentences (~60 words) of specific, actionable advice. Name the single biggest bottleneck and the one move to restore flow. Data: in progress=${i.wip}, blocked=${i.blocked}${bk.length ? " (" + bk.map((t) => t.text).join("; ") + ")" : ""}, overdue=${i.overdue}, busiest list=${i.busiest ? i.busiest[0] + " (" + i.busiest[1] + " open)" : "n/a"}. No preamble, no markdown.`;
  }
  if (mode === "review") {
    const ship = (b.groups.find((g) => g.key === "ship") || { items: [] }).items;
    const slip = (b.groups.find((g) => g.key === "slip") || { items: [] }).items;
    return `You are a thoughtful team lead writing a WEEKLY REVIEW. In 3-4 sentences (~70 words): celebrate what shipped, note what slipped and a likely reason, then give 2-3 concrete focus suggestions for next week. Data: shipped this week=${b.shipped} (${ship.map((t) => t.text).join("; ") || "none logged"}), still open=${b.open}, slipped/overdue=${slip.map((t) => t.text).join("; ") || "none"}. Warm but useful. No preamble, no markdown.`;
  }
  return `You are a sharp delivery lead writing a short SPRINT summary from a task board. Write 2-3 sentences (max ~55 words): momentum this week, what's at risk, and the one priority to push. Natural tone, no preamble, no markdown. Data: completed this week=${b.velocity}, open=${b.open}, at-risk(high & due soon)=${(b.atRisk || []).map((t) => t.text).join("; ") || "none"}. Top open: ${b.groups[0] ? b.groups[0].items.map((t) => t.text + " (" + t.pri + ")").join("; ") : "none"}`;
}

export function fallbackNarrative(tasks: Task[], mode: BriefMode): string {
  const b = buildBrief(tasks, mode);
  if (mode === "daily") {
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
  if (mode === "recap") {
    const n = b.recapCount || 0;
    const t0 = b.groups[0] && b.groups[0].items[0];
    return n
      ? `You closed ${n} task${n > 1 ? "s" : ""} today${t0 ? `, including “${t0.text}”` : ""}. Nice work — that's real momentum.`
      : "Nothing marked done today yet. Drag a card to Done to close it out.";
  }
  if (mode === "triage") {
    if (b.empty) return "Nothing needs triage — no overdue, stalled, or undated work. Clean board.";
    const g = Object.fromEntries(b.groups.map((x) => [x.key, x.items]));
    const bits: string[] = [];
    if (g.od) bits.push(`${g.od.length} overdue to reschedule`);
    if (g.st) bits.push(`${g.st.length} stalled in progress`);
    if (g.nd) bits.push(`${g.nd.length} high-priority with no date`);
    return `Triage: ${bits.join(", ")}. Clear the overdue items first, then give the stalled work a due date — or drop it.`;
  }
  if (mode === "insights") {
    const i = b.insight || { wip: 0, blocked: 0, overdue: 0, busiest: null };
    if (b.empty) return "Flow looks healthy — nothing blocked, overloaded, or overdue. Keep pulling one task at a time.";
    const bits: string[] = [];
    if (i.blocked) bits.push(`${i.blocked} task${i.blocked > 1 ? "s" : ""} blocked — unblocking these frees the most flow`);
    if (i.wip > 3) bits.push(`${i.wip} in progress at once — finish before starting more`);
    if (i.overdue) bits.push(`${i.overdue} overdue dragging on your focus`);
    let s = bits.length ? `Biggest drag: ${bits[0]}.` : "";
    if (bits[1]) s += ` Also: ${bits[1]}.`;
    if (i.busiest && i.busiest[1] >= 4) s += ` “${i.busiest[0]}” is carrying ${i.busiest[1]} open items — consider splitting it.`;
    return s.trim();
  }
  if (mode === "review") {
    const shipped = b.shipped || 0;
    const open = b.open || 0;
    const overdue = b.overdue || 0;
    return `You shipped ${shipped} task${shipped === 1 ? "" : "s"} this week with ${open} still open${overdue ? ` and ${overdue} overdue` : ""}. ${overdue ? "Reschedule or drop what slipped, then" : "Solid week —"} pick your top 2-3 priorities for next week and protect time for them.`;
  }
  const risk = (b.atRisk || []).length;
  return `${b.velocity} task${b.velocity === 1 ? "" : "s"} closed this week with ${b.open} still open. ${risk ? `${risk} high-priority item${risk > 1 ? "s" : ""} at risk — protect ${b.atRisk![0].text}.` : "Nothing flagged at risk — keep the pace."} Push your top priority next.`;
}

export function briefPlainText(tasks: Task[], mode: BriefMode): string {
  const b = buildBrief(tasks, mode);
  const lines = [
    mode === "daily"
      ? "DAILY BRIEF"
      : mode === "sprint"
        ? "SPRINT SUMMARY"
        : mode === "recap"
          ? "END-OF-DAY RECAP"
          : mode === "insights"
            ? "INSIGHTS"
            : mode === "review"
              ? "WEEKLY REVIEW"
              : "TRIAGE",
    "",
  ];
  if ((mode === "sprint" || mode === "review") && b.stats) lines.push(b.stats.map((s) => `${s.v} ${s.l}`).join("  ·  "), "");
  b.groups.forEach((g) => {
    lines.push(g.label.toUpperCase());
    g.items.forEach((t) => lines.push(`  • ${t.text}${t.due ? " (" + (fmtDue(t.due)?.label || t.due) + ")" : ""} [${t.pri}]`));
    lines.push("");
  });
  return lines.join("\n").trim();
}
