/* Domain types for Nimbus.
 *
 * The client works with a denormalised Task (subtasks/comments/deps embedded),
 * matching the prototype's shape so the ported logic & components stay intact.
 * The data layer (src/data) assembles these from the relational Postgres tables
 * and maps category_id <-> category name on the way in/out. */

export type Priority = "high" | "med" | "low";
export type Repeat = "none" | "daily" | "weekdays" | "weekly";
export type LaneBy = "none" | "category" | "priority";
export type View = "board" | "calendar" | "reports" | "wishlist";

/** A wish's kind: something to buy, a goal to achieve, or an experience to have. */
export type WishType = "buy" | "goal" | "exp";
/** Lifecycle stage; drives the self-sorting feed buckets. */
export type WishStage = "wishing" | "saving" | "ready" | "got";

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

export interface Comment {
  id: string;
  by: string;
  /** Display string derived from created_at (e.g. "2d ago", "just now"). */
  time: string;
  text: string;
}

export interface Task {
  id: string;
  boardId: string;
  text: string;
  /** Column key: "todo" | "doing" | "done" | custom column key. */
  status: string;
  pri: Priority;
  /** Category name (or "" / null when uncategorised). Mapped to category_id in DB. */
  cat: string | null;
  /** Due date as YYYY-MM-DD, or "" when none. */
  due: string;
  /** Estimate in hours (0 = none). */
  est: number;
  desc: string;
  repeat?: Repeat;
  /** YYYY-MM-DD when completed, else null. */
  completedAt?: string | null;
  /** YYYY-MM-DD when first moved to "doing" — powers real cycle-time in Reports. */
  startedAt?: string | null;
  comments: Comment[];
  deps: string[];
  subtasks: Subtask[];
  /** Manual ordering within a column. */
  position: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Column {
  key: string;
  name: string;
  /** Dot color (CSS color or `var(--accent)`). */
  dot: string;
  /** Core columns (To Do / In Progress / Done) can reorder but not be deleted. */
  core?: boolean;
}

export interface Board {
  id: string;
  name: string;
}

/** A pinned one-line note to raise with a client/in a meeting. Lives per board.
 * Either sourced from a card (taskId set) or typed by hand (taskId null). */
export interface TalkingPoint {
  id: string;
  /** The one-line note (editable). */
  text: string;
  /** Links to a board task; null = manually typed. */
  taskId: string | null;
  /** "Discussed". */
  done: boolean;
  /** Manual ordering within the list. */
  position: number;
}

/** A single wish in the per-user Wishlist space. Money is tracked toward each
 * one; the stage + saved/price ratio decide which feed bucket it lands in. */
export interface Wish {
  id: string;
  title: string;
  type: WishType;
  /** Goal cost. null = "no price yet". */
  price: number | null;
  /** Amount saved toward the price so far. */
  saved: number;
  pri: Priority;
  /** Store / source ("—" or "" treated as empty). */
  where: string;
  link: string;
  note: string;
  /** Freeform target date, e.g. "Oct 2026". */
  target: string;
  stage: WishStage;
  /** Manual ordering (newest captured first). */
  position: number;
}

/** A board's full working set, as the client holds it in memory. */
export interface BoardData {
  id: string;
  name: string;
  tasks: Task[];
  cats: Category[];
  columns: Column[];
  points: TalkingPoint[];
}

export interface Theme {
  name: string;
  bg: [string, string, string];
  accent: string;
  ink?: string;
  muted?: string;
  surf?: string;
  dark?: boolean;
}

export interface Tweaks {
  accent: string;
  radius: number;
  blur: number;
  opacity: number;
}

export interface Preferences {
  theme: number;
  tweaks: Tweaks;
  wipLimit: number;
  laneBy: LaneBy;
  activeBoardId: string | null;
}

/** Aggregated AI usage for the Reports "AI usage" card. */
export interface AIUsage {
  total: number;
  prov: Record<string, number>;
  days: Record<string, number>;
  tokIn: Record<string, number>;
  tokOut: Record<string, number>;
  last?: number;
}
