/* Raw Supabase reads/writes. The controller (useBoardData) builds DB-shaped
 * payloads from the client models and calls these; optimistic cache updates live
 * in the hook so these stay thin and predictable. */
import { supabase } from "@/lib/supabase";
import type { Board } from "@/types";
import {
  assembleBoard,
  type CategoryRow,
  type ColumnRow,
  type CommentRow,
  type DepRow,
  type SubtaskRow,
  type TaskRow,
} from "./mapping";

export async function fetchBoardList(): Promise<Board[]> {
  const { data, error } = await supabase.from("boards").select("id, name, position").order("position");
  if (error) throw error;
  return (data ?? []).map((b) => ({ id: b.id, name: b.name }));
}

export async function fetchBoardData(boardId: string, name: string) {
  const [cats, cols, tasks] = await Promise.all([
    supabase.from("categories").select("id, name, color, position").eq("board_id", boardId),
    supabase.from("columns").select("id, key, name, dot, core, position").eq("board_id", boardId),
    supabase
      .from("tasks")
      .select("id, board_id, text, status, pri, category_id, due, est, description, repeat, started_at, completed_at, position")
      .eq("board_id", boardId),
  ]);
  if (cats.error) throw cats.error;
  if (cols.error) throw cols.error;
  if (tasks.error) throw tasks.error;

  const taskIds = (tasks.data ?? []).map((t) => t.id);
  let subs: SubtaskRow[] = [];
  let comments: CommentRow[] = [];
  let deps: DepRow[] = [];
  if (taskIds.length) {
    const [s, c, d] = await Promise.all([
      supabase.from("subtasks").select("id, task_id, text, done, position").in("task_id", taskIds),
      supabase.from("comments").select("id, task_id, author, body, created_at").in("task_id", taskIds),
      supabase.from("task_dependencies").select("task_id, depends_on_task_id").in("task_id", taskIds),
    ]);
    if (s.error) throw s.error;
    if (c.error) throw c.error;
    if (d.error) throw d.error;
    subs = (s.data ?? []) as SubtaskRow[];
    comments = (c.data ?? []) as CommentRow[];
    deps = (d.data ?? []) as DepRow[];
  }

  return assembleBoard(
    boardId,
    name,
    (cats.data ?? []) as CategoryRow[],
    (cols.data ?? []) as ColumnRow[],
    (tasks.data ?? []) as TaskRow[],
    subs,
    comments,
    deps,
  );
}

/* ---- Tasks ---- */
export async function insertTaskRow(row: Partial<TaskRow>): Promise<void> {
  const { error } = await supabase.from("tasks").insert(row);
  if (error) throw error;
}
export async function updateTaskRow(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteTaskRow(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
export async function updateTaskPositions(updates: Array<{ id: string; position: number; status: string }>): Promise<void> {
  await Promise.all(updates.map((u) => supabase.from("tasks").update({ position: u.position, status: u.status }).eq("id", u.id)));
}

/* ---- Subtasks (reconcile a task's full list) ---- */
export async function reconcileSubtasks(
  taskId: string,
  subtasks: Array<{ id: string; text: string; done: boolean }>,
): Promise<void> {
  const { data: existing, error } = await supabase.from("subtasks").select("id").eq("task_id", taskId);
  if (error) throw error;
  const keep = new Set(subtasks.map((s) => s.id));
  const toDelete = (existing ?? []).map((r) => r.id).filter((id) => !keep.has(id));
  if (toDelete.length) await supabase.from("subtasks").delete().in("id", toDelete);
  if (subtasks.length) {
    const rows = subtasks.map((s, i) => ({ id: s.id, task_id: taskId, text: s.text, done: s.done, position: i }));
    const { error: upErr } = await supabase.from("subtasks").upsert(rows);
    if (upErr) throw upErr;
  }
}

/* ---- Dependencies (reconcile a task's full list) ---- */
export async function reconcileDeps(taskId: string, deps: string[]): Promise<void> {
  const { error: delErr } = await supabase.from("task_dependencies").delete().eq("task_id", taskId);
  if (delErr) throw delErr;
  if (deps.length) {
    const rows = deps.map((d) => ({ task_id: taskId, depends_on_task_id: d }));
    const { error } = await supabase.from("task_dependencies").insert(rows);
    if (error) throw error;
  }
}

/* ---- Comments ---- */
export async function insertCommentRow(id: string, taskId: string, body: string, author = "You"): Promise<void> {
  const { error } = await supabase.from("comments").insert({ id, task_id: taskId, body, author });
  if (error) throw error;
}

/* ---- Categories ---- */
export async function insertCategoryRow(row: { id: string; board_id: string; name: string; color: string; position: number }) {
  const { error } = await supabase.from("categories").insert(row);
  if (error) throw error;
}
export async function updateCategoryRow(id: string, patch: { name?: string; color?: string }) {
  const { error } = await supabase.from("categories").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteCategoryRow(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/* ---- Columns ---- */
export async function insertColumnRow(row: { id: string; board_id: string; key: string; name: string; dot: string; core: boolean; position: number }) {
  const { error } = await supabase.from("columns").insert(row);
  if (error) throw error;
}
export async function updateColumnByKey(boardId: string, key: string, patch: { name?: string; position?: number }) {
  const { error } = await supabase.from("columns").update(patch).eq("board_id", boardId).eq("key", key);
  if (error) throw error;
}
export async function setColumnPositions(boardId: string, order: Array<{ key: string; position: number }>) {
  await Promise.all(order.map((o) => supabase.from("columns").update({ position: o.position }).eq("board_id", boardId).eq("key", o.key)));
}
export async function deleteColumnByKey(boardId: string, key: string) {
  const { error } = await supabase.from("columns").delete().eq("board_id", boardId).eq("key", key);
  if (error) throw error;
}

/* ---- Boards ---- */
export async function createBoardRow(id: string, name: string, position: number): Promise<void> {
  const { error } = await supabase.from("boards").insert({ id, name, position });
  if (error) throw error;
}
export async function renameBoardRow(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("boards").update({ name }).eq("id", id);
  if (error) throw error;
}
export async function deleteBoardRow(id: string): Promise<void> {
  const { error } = await supabase.from("boards").delete().eq("id", id);
  if (error) throw error;
}
export async function seedStarterBoard(withSamples = true): Promise<string> {
  const { data, error } = await supabase.rpc("seed_starter_board", { with_samples: withSamples });
  if (error) throw error;
  return data as string;
}
