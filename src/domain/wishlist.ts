/* Wishlist domain logic — pure helpers ported from the design handoff.
 *
 * Holds the type/priority/stage token tables, the lightweight `smartParse`
 * capture heuristic, the per-filter totals, and the self-sorting bucket rules.
 * Kept free of React/DOM so it can be unit-tested and reused by the view + hook.
 * (See src/components/views/WishlistView.tsx for the UI that consumes these.) */
import type { Priority, Wish, WishStage, WishType } from "@/types";

/* ---------- money formatting ---------- */
export const fmt$ = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
};

/* ---------- type / priority / stage tokens ---------- */
export interface TypeToken {
  label: string;
  /** Icon key in WISH_ICONS / the rail filter list. */
  ic: "bag" | "target" | "compass";
  /** Thumbnail / hero gradient stops. */
  g: [string, string];
}
export const TYPES: Record<WishType, TypeToken> = {
  buy: { label: "Buy", ic: "bag", g: ["#a78bfa", "#7c5cff"] },
  goal: { label: "Goal", ic: "target", g: ["#34d399", "#0ea5e9"] },
  exp: { label: "Experience", ic: "compass", g: ["#fb923c", "#ff6a88"] },
};

export interface PriToken {
  label: string;
  /** Dot color. */
  c: string;
  /** Soft pill background. */
  soft: string;
  /** Pill text color. */
  ink: string;
}
export const PRI: Record<Priority, PriToken> = {
  high: { label: "Must have", c: "#f0506e", soft: "rgba(240,80,110,0.14)", ink: "#d4456b" },
  med: { label: "Want", c: "#f5a623", soft: "rgba(245,166,35,0.16)", ink: "#c47e10" },
  low: { label: "Someday", c: "#38c172", soft: "rgba(56,193,114,0.16)", ink: "#1f8f54" },
};

export const STAGES: Array<{ key: WishStage; name: string; dot: string }> = [
  { key: "wishing", name: "Wishing", dot: "#7c5cff" },
  { key: "saving", name: "Saving up", dot: "#f5a623" },
  { key: "ready", name: "Ready", dot: "#0ea5e9" },
  { key: "got", name: "Got it", dot: "#38c172" },
];

/** Green that a progress bar / "got" state turns at 100%. */
export const DONE_GREEN = "#38c172";

/* ---------- deterministic thumbnail gradient angle ---------- */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
/** Stable 110–199° gradient angle from a wish's id+title. */
export const thumbAngle = (id: string, title: string): number => (hashStr(id + title) % 90) + 110;

/* ---------- saved/price ratio + progress percent ---------- */
/** Funded fraction. Without a price there's no goal to be a fraction *of*, so a
 * price-less wish is 0% funded (never auto-100%) — otherwise a no-price wish with
 * a dollar saved would jump into the "Almost there (>60%)" bucket. */
export const savedRatio = (w: Pick<Wish, "price" | "saved">): number =>
  w.price && w.price > 0 ? w.saved / w.price : 0;
export const savedPct = (saved: number, price: number | null): number =>
  price && price > 0 ? Math.min(100, Math.round((saved / price) * 100)) : saved > 0 ? 100 : 0;

/* ---------- per-filter totals (remaining / saved / goal / counts) ---------- */
export interface Totals {
  goal: number;
  saved: number;
  remaining: number;
  ready: number;
  got: number;
  count: number;
}
/** Totals over the *active* (not-yet-got) wishes, plus ready/got counts. */
export function totals(items: Wish[]): Totals {
  const active = items.filter((i) => i.stage !== "got");
  const goal = active.reduce((s, i) => s + (i.price || 0), 0);
  // Only savings put toward a *priced* wish count against the goal (capped at the
  // price). A no-price wish contributes nothing to either side, so its savings
  // can't understate "left to save" or overfill the progress bar.
  const saved = active.reduce((s, i) => s + (i.price && i.price > 0 ? Math.min(i.saved || 0, i.price) : 0), 0);
  return {
    goal,
    saved,
    remaining: Math.max(0, goal - saved),
    ready: items.filter((i) => i.stage === "ready").length,
    got: items.filter((i) => i.stage === "got").length,
    count: active.length,
  };
}

/* ---------- self-sorting feed buckets ---------- */
export type BucketKey = "ready" | "almost" | "saving" | "dream" | "got";
export interface BucketDef {
  key: BucketKey;
  /** Accent line-icon key. */
  icon: "circleCheck" | "flame" | "wallet" | "moon" | "gift";
  name: string;
  desc: string;
}
/** Ordered bucket definitions; empty buckets are hidden by the view. */
export const BUCKETS: BucketDef[] = [
  { key: "ready", icon: "circleCheck", name: "Ready to get", desc: "Fully funded — go for it" },
  { key: "almost", icon: "flame", name: "Almost there", desc: "Past 60% saved" },
  { key: "saving", icon: "wallet", name: "Saving up", desc: "On the way" },
  { key: "dream", icon: "moon", name: "Just dreaming", desc: "No plan yet" },
  { key: "got", icon: "gift", name: "Got it", desc: "" },
];
/** Which bucket a wish belongs to (stage + saved/price ratio). */
export function bucketOf(w: Wish): BucketKey {
  if (w.stage === "ready") return "ready";
  if (w.stage === "got") return "got";
  if (w.stage === "saving") return savedRatio(w) >= 0.6 ? "almost" : "saving";
  return "dream";
}

/* ---------- stage derivation ---------- */
/** Re-derive a wish's stage from its money, given its current stage. Single
 * source of truth shared by bumping savings AND editing the price, so the two
 * paths can never disagree (raising a Ready wish's price above its saved demotes
 * it; lowering the price to ≤ saved promotes it). "got" is always left alone.
 *  - fully funded (priced & saved ≥ price) → ready
 *  - a Ready wish that's no longer funded → saving (or wishing if nothing saved)
 *  - first dollars on a Just-dreaming wish → saving */
export function deriveStage(saved: number, price: number | null, stage: WishStage): WishStage {
  if (stage === "got") return "got";
  if (price && price > 0 && saved >= price) return "ready";
  if (stage === "ready") return saved > 0 ? "saving" : "wishing";
  if (saved > 0 && stage === "wishing") return "saving";
  return stage;
}

/* ---------- savings bump rule ---------- */
/** Apply a savings delta and re-derive the stage via {@link deriveStage}. */
export function applyBump(w: Wish, amount: number): { saved: number; stage: WishStage } {
  const saved = Math.max(0, (w.saved || 0) + amount);
  const stage = deriveStage(saved, w.price, w.stage);
  return { saved, stage };
}

/* ---------- smart capture parser ----------
   Understands:  "Sony XM5 headphones $399 must have at Amazon"
                 a pasted URL  →  infers a source from the domain
                 "high/must" → high · "want" → med · "someday" → low
   NOTE: link enrichment (real title/image/price from a URL) is a backend task;
   here we only derive the source from the domain. See useWishes for the stub. */
export interface ParsedWish {
  title: string;
  price: number | null;
  pri: Priority;
  type: WishType;
  where: string;
  link: string;
  note: string;
}
export function smartParse(raw: string): ParsedWish {
  let text = (raw || "").trim();
  const out: ParsedWish = { title: "", price: null, pri: "med", type: "buy", where: "", link: "", note: "" };
  if (!text) return out;

  // URL → link + source from domain
  const urlM = text.match(/https?:\/\/[^\s]+/i);
  if (urlM) {
    out.link = urlM[0];
    const dom = urlM[0].replace(/^https?:\/\/(www\.)?/i, "").split("/")[0];
    out.where = dom.split(".")[0].replace(/^\w/, (c) => c.toUpperCase());
    text = text.replace(urlM[0], "").trim();
  }
  // price  $1,299  or  1299 dollars
  const priceM = text.match(/\$\s?([\d,]+(?:\.\d+)?)/) || text.match(/([\d,]+)\s?(?:dollars|usd|bucks)/i);
  if (priceM) {
    out.price = parseFloat(priceM[1].replace(/,/g, ""));
    text = text.replace(priceM[0], "").trim();
  }
  // priority words
  if (/\b(must[- ]?have|must|high|need|dream)\b/i.test(text)) {
    out.pri = "high";
    text = text.replace(/\b(must[- ]?have|must|high priority|high|need|dream)\b/i, "").trim();
  } else if (/\b(someday|low|maybe|eventually)\b/i.test(text)) {
    out.pri = "low";
    text = text.replace(/\b(someday|low priority|low|maybe|eventually)\b/i, "").trim();
  } else if (/\b(want|medium|med)\b/i.test(text)) {
    out.pri = "med";
    text = text.replace(/\b(want to|want|medium priority|medium|med)\b/i, "").trim();
  }
  // type cues
  if (/\b(trip|travel|visit|vacation|getaway|dinner|concert|class|lesson|retreat|tour)\b/i.test(text)) out.type = "exp";
  if (/\b(learn|run|finish|read|master|achieve|train|build|write)\b/i.test(text)) out.type = "goal";
  // source  "at X" / "from X"
  const srcM = text.match(/\b(?:at|from)\s+([A-Z][\w&' ]{1,18})/);
  if (srcM && !out.where) {
    out.where = srcM[1].trim();
    text = text.replace(srcM[0], "").trim();
  }
  // title = cleaned remainder, capitalized, with a sensible fallback
  out.title = text.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim() || (out.where ? out.where + " item" : "New wish");
  out.title = out.title.replace(/^\w/, (c) => c.toUpperCase());
  return out;
}

/* ---------- empty form draft (string fields for controlled inputs) ---------- */
export interface WishDraft {
  title: string;
  price: string;
  saved: string;
  pri: Priority;
  type: WishType;
  where: string;
  link: string;
  note: string;
  target: string;
}
export const emptyDraft = (): WishDraft => ({
  title: "",
  price: "",
  saved: "",
  pri: "med",
  type: "buy",
  where: "",
  link: "",
  note: "",
  target: "",
});

/* ---------- sample seed (mirrors the prototype's SEED) ---------- */
export type SeedWish = Omit<Wish, "id" | "position">;
export const SEED_WISHES: SeedWish[] = [
  { title: "Sony WH-1000XM5 headphones", type: "buy", price: 399, saved: 180, pri: "high", where: "Amazon", link: "", note: "For focus + flights. Replace the old XM3s.", target: "Aug 2026", stage: "saving" },
  { title: "Standing desk (motorized)", type: "buy", price: 620, saved: 210, pri: "med", where: "Fully", link: "", note: "Oak top, 60×30.", target: "", stage: "saving" },
  { title: "Two weeks in Japan", type: "exp", price: 3500, saved: 900, pri: "high", where: "", link: "", note: "Spring, cherry blossom season. Tokyo + Kyoto.", target: "Apr 2027", stage: "saving" },
  { title: "Breville Barista Express", type: "buy", price: 700, saved: 700, pri: "med", where: "Williams Sonoma", link: "", note: "Ready to pull the trigger.", target: "", stage: "ready" },
  { title: "Run a half marathon", type: "goal", price: 450, saved: 120, pri: "high", where: "Race + coaching", link: "", note: "Entry fee + 12-week plan + shoes.", target: "Oct 2026", stage: "saving" },
  { title: "Learn to surf", type: "exp", price: 280, saved: 0, pri: "low", where: "Pacifica lessons", link: "", note: "Pack of 4 beginner lessons.", target: "", stage: "wishing" },
  { title: "Weekend cabin getaway", type: "exp", price: 540, saved: 540, pri: "med", where: "Big Bear", link: "", note: "Booked-ready. Just pick a date.", target: "", stage: "ready" },
  { title: "Fujifilm 35mm f/1.4 lens", type: "buy", price: 1100, saved: 460, pri: "med", where: "B&H", link: "", note: "The portrait lens I keep renting.", target: "", stage: "saving" },
  { title: "Pottery wheel course", type: "goal", price: 190, saved: 190, pri: "low", where: "Clay studio", link: "", note: "8-week beginner course.", target: "", stage: "got" },
  { title: "New trail running shoes", type: "buy", price: 150, saved: 150, pri: "low", where: "REI", link: "", note: "Got them — love them.", target: "", stage: "got" },
];
