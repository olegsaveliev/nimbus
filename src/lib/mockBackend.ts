/* Local-only mock backend for previewing the UI without a Supabase project.
 *
 * Activated automatically when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
 * missing (see supabase.ts). It implements just enough of the Supabase client
 * surface the app uses — a chainable PostgREST-style query builder, auth, two
 * RPCs, and a stubbed AI function — backed by an in-memory store persisted to
 * localStorage. NOT for production; the real client takes over once env is set. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { DAY, iso, startOfToday } from "@/domain/dates";

const uid = () => crypto.randomUUID();
const DB_KEY = "nimbus-mock-db-v1";
const MOCK_USER = { id: "demo-user", email: "demo@nimbus.app" };

type Row = Record<string, unknown>;
interface Store {
  boards: Row[];
  columns: Row[];
  categories: Row[];
  tasks: Row[];
  subtasks: Row[];
  comments: Row[];
  task_dependencies: Row[];
  user_preferences: Row[];
  ai_events: Row[];
}

function emptyStore(): Store {
  return { boards: [], columns: [], categories: [], tasks: [], subtasks: [], comments: [], task_dependencies: [], user_preferences: [], ai_events: [] };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return { ...emptyStore(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return emptyStore();
}

const store = load();
function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/* ---- chainable query builder ---- */
type Filter = (r: Row) => boolean;
class Query<T = unknown> implements PromiseLike<{ data: T; error: null }> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row | Row[] | null = null;
  private filters: Filter[] = [];
  private single = false;
  private orderBy: { c: string; asc: boolean } | null = null;
  private limitN: number | null = null;

  constructor(private table: keyof Store) {}

  select(_cols?: string) { this.op = "select"; return this; }
  insert(p: Row | Row[]) { this.op = "insert"; this.payload = p; return this; }
  update(p: Row) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  upsert(p: Row | Row[]) { this.op = "upsert"; this.payload = p; return this; }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  in(c: string, vals: unknown[]) { this.filters.push((r) => vals.includes(r[c])); return this; }
  order(c: string, opts?: { ascending?: boolean }) { this.orderBy = { c, asc: opts?.ascending !== false }; return this; }
  limit(n: number) { this.limitN = n; return this; }
  maybeSingle() { this.single = true; return this; }

  private match(r: Row) { return this.filters.every((f) => f(r)); }

  private exec(): { data: T; error: null } {
    const t = store[this.table];
    if (this.op === "select") {
      let rows = t.filter((r) => this.match(r));
      if (this.orderBy) {
        const { c, asc } = this.orderBy;
        rows = [...rows].sort((a, b) => ((a[c] as number) > (b[c] as number) ? 1 : (a[c] as number) < (b[c] as number) ? -1 : 0) * (asc ? 1 : -1));
      }
      if (this.limitN != null) rows = rows.slice(0, this.limitN);
      return { data: (this.single ? rows[0] ?? null : rows) as T, error: null };
    }
    if (this.op === "insert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
      rows.forEach((r) => t.push({ ...r }));
      persist();
      return { data: rows as T, error: null };
    }
    if (this.op === "update") {
      t.forEach((r) => { if (this.match(r)) Object.assign(r, this.payload); });
      persist();
      return { data: null as T, error: null };
    }
    if (this.op === "delete") {
      store[this.table] = t.filter((r) => !this.match(r));
      persist();
      return { data: null as T, error: null };
    }
    // upsert
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
    rows.forEach((nr) => {
      const key = nr.id != null ? "id" : "user_id";
      const idx = t.findIndex((r) => r[key] === nr[key]);
      if (idx >= 0) t[idx] = { ...t[idx], ...nr };
      else t.push({ ...nr });
    });
    persist();
    return { data: rows as T, error: null };
  }

  then<R1 = { data: T; error: null }, R2 = never>(
    onfulfilled?: ((value: { data: T; error: null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    try {
      return Promise.resolve(this.exec()).then(onfulfilled, onrejected);
    } catch (e) {
      return Promise.reject(e).then(onfulfilled, onrejected) as PromiseLike<R2>;
    }
  }
}

/* ---- seeding (mirrors the SQL seed_starter_board / new_board functions) ---- */
function defaultColumns(boardId: string) {
  return [
    { id: uid(), board_id: boardId, key: "todo", name: "To Do", dot: "var(--accent)", core: true, position: 0 },
    { id: uid(), board_id: boardId, key: "doing", name: "In Progress", dot: "#f5a623", core: true, position: 1 },
    { id: uid(), board_id: boardId, key: "done", name: "Done", dot: "#38c172", core: true, position: 2 },
  ];
}
function defaultCats(boardId: string) {
  return [
    { id: uid(), board_id: boardId, name: "Work", color: "#7c5cff", position: 0 },
    { id: uid(), board_id: boardId, name: "Personal", color: "#ff6b9d", position: 1 },
    { id: uid(), board_id: boardId, name: "Health", color: "#22d3ee", position: 2 },
    { id: uid(), board_id: boardId, name: "Shopping", color: "#fb923c", position: 3 },
  ];
}

function seedStarterBoard(withSamples: boolean): string {
  const boardId = uid();
  store.boards.push({ id: boardId, user_id: MOCK_USER.id, name: "My Board", position: store.boards.length });
  store.columns.push(...defaultColumns(boardId));
  const cats = defaultCats(boardId);
  store.categories.push(...cats);
  const catByName = Object.fromEntries(cats.map((c) => [c.name, c.id as string]));

  const prefIdx = store.user_preferences.findIndex((p) => p.user_id === MOCK_USER.id);
  const pref = { user_id: MOCK_USER.id, active_board_id: boardId };
  if (prefIdx >= 0) store.user_preferences[prefIdx] = { ...store.user_preferences[prefIdx], ...pref };
  else store.user_preferences.push(pref);

  if (withSamples) {
    const today = startOfToday();
    const d = (off: number) => iso(new Date(today.getTime() + off * DAY));
    const proposal = uid();
    const feedback = uid();
    store.tasks.push(
      { id: proposal, board_id: boardId, text: "Send the Q3 proposal to Maya", status: "todo", pri: "high", category_id: catByName.Work, due: d(0), est: 2, description: "Final numbers from finance are in. Pull the latest deck, swap in the Q3 figures, and write a short cover note before sending to Maya for sign-off.", repeat: null, started_at: null, completed_at: null, position: 0 },
      { id: feedback, board_id: boardId, text: "Revise the design feedback thread", status: "doing", pri: "med", category_id: catByName.Work, due: d(1), est: 1, description: "Address the comments on spacing and the empty states.", repeat: null, started_at: d(-1), completed_at: null, position: 1 },
      { id: uid(), board_id: boardId, text: "Book dentist appointment", status: "todo", pri: "med", category_id: catByName.Health, due: d(-1), est: 0, description: "", repeat: null, started_at: null, completed_at: null, position: 2 },
      { id: uid(), board_id: boardId, text: "Draft birthday plans for Sam", status: "todo", pri: "med", category_id: catByName.Personal, due: d(4), est: 0, description: "Thinking dinner + something low-key after. Check who's free that weekend.", repeat: null, started_at: null, completed_at: null, position: 3 },
      { id: uid(), board_id: boardId, text: "30-min evening walk", status: "doing", pri: "low", category_id: catByName.Health, due: d(0), est: 0, description: "", repeat: "daily", started_at: d(0), completed_at: null, position: 4 },
      { id: uid(), board_id: boardId, text: "Pick up oat milk & lemons", status: "done", pri: "low", category_id: catByName.Shopping, due: d(-1), est: 0, description: "", repeat: null, started_at: d(-1), completed_at: d(0), position: 5 },
      { id: uid(), board_id: boardId, text: "Renew gym membership", status: "done", pri: "med", category_id: catByName.Health, due: d(-2), est: 0, description: "", repeat: null, started_at: d(-2), completed_at: d(-1), position: 6 },
    );
    store.subtasks.push(
      { id: uid(), task_id: proposal, text: "Pull the latest figures from finance", done: true, position: 0 },
      { id: uid(), task_id: proposal, text: "Swap Q3 numbers into slides 3–5", done: false, position: 1 },
      { id: uid(), task_id: proposal, text: "Write a short cover note", done: false, position: 2 },
    );
    store.comments.push(
      { id: uid(), task_id: proposal, author: "Maya R.", body: "Can we add the regional breakdown to slide 4? Leadership will ask.", created_at: new Date(today.getTime() - 2 * DAY).toISOString() },
      { id: uid(), task_id: proposal, author: "You", body: "Good call — adding it now. Should have a draft over by end of day.", created_at: new Date(today.getTime() - DAY).toISOString() },
    );
    store.task_dependencies.push({ task_id: proposal, depends_on_task_id: feedback });
  }
  persist();
  return boardId;
}

function newBoard(name: string): string {
  const boardId = uid();
  store.boards.push({ id: boardId, user_id: MOCK_USER.id, name: name?.trim() || "New board", position: store.boards.length });
  store.columns.push(...defaultColumns(boardId));
  store.categories.push(...defaultCats(boardId));
  persist();
  return boardId;
}

/* ---- auth ---- */
type AuthCb = (event: string, session: unknown) => void;
const listeners = new Set<AuthCb>();
let session: { user: typeof MOCK_USER; access_token: string } | null = { user: MOCK_USER, access_token: "demo" };
function emit(event: string) {
  listeners.forEach((cb) => cb(event, session));
}

const auth = {
  async getSession() {
    return { data: { session }, error: null };
  },
  async getUser() {
    return { data: { user: session?.user ?? null }, error: null };
  },
  onAuthStateChange(cb: AuthCb) {
    listeners.add(cb);
    setTimeout(() => cb("INITIAL_SESSION", session), 0);
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
  async signInAnonymously() {
    session = { user: MOCK_USER, access_token: "demo" };
    emit("SIGNED_IN");
    return { data: { session }, error: null };
  },
  async signInWithPassword() {
    session = { user: MOCK_USER, access_token: "demo" };
    emit("SIGNED_IN");
    return { data: { session }, error: null };
  },
  async signUp() {
    session = { user: MOCK_USER, access_token: "demo" };
    emit("SIGNED_IN");
    return { data: { session }, error: null };
  },
  async signOut() {
    session = null;
    emit("SIGNED_OUT");
    return { error: null };
  },
};

export const mockSupabase = {
  auth,
  from(table: keyof Store) {
    return new Query(table);
  },
  async rpc(name: string, args: Record<string, unknown>) {
    if (name === "seed_starter_board") return { data: seedStarterBoard(args?.with_samples !== false), error: null };
    if (name === "new_board") return { data: newBoard(String(args?.p_name ?? "New board")), error: null };
    return { data: null, error: { message: "unknown rpc " + name } };
  },
  functions: {
    // AI is disabled in demo mode; callers fall back gracefully (e.g. Brief uses
    // its template narrative, card assists show "AI isn't available").
    async invoke() {
      return { data: { error: "ai-not-configured" }, error: null };
    },
  },
} as unknown as SupabaseClient;
