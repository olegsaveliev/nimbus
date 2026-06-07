/* Maps relational Postgres rows <-> the client's denormalised models. */
import type { BoardData, Category, Column, Comment, Subtask, TalkingPoint, Task } from "@/types";

export interface TaskRow {
  id: string;
  board_id: string;
  text: string;
  status: string;
  pri: "high" | "med" | "low";
  category_id: string | null;
  due: string | null;
  est: number | string;
  description: string;
  repeat: string | null;
  started_at: string | null;
  completed_at: string | null;
  position: number;
}
export interface SubtaskRow {
  id: string;
  task_id: string;
  text: string;
  done: boolean;
  position: number;
}
export interface CommentRow {
  id: string;
  task_id: string;
  author: string;
  body: string;
  created_at: string;
}
export interface CategoryRow {
  id: string;
  name: string;
  color: string;
  position: number;
}
export interface ColumnRow {
  id: string;
  key: string;
  name: string;
  dot: string;
  core: boolean;
  position: number;
}
export interface DepRow {
  task_id: string;
  depends_on_task_id: string;
}
export interface TalkingPointRow {
  id: string;
  board_id: string;
  text: string;
  task_id: string | null;
  done: boolean;
  position: number;
}

/** Human "time ago" for comment timestamps. */
export function timeAgo(isoTs: string): string {
  const then = new Date(isoTs).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export function mapCategory(r: CategoryRow): Category {
  return { id: r.id, name: r.name, color: r.color };
}

export function mapColumn(r: ColumnRow): Column {
  return { key: r.key, name: r.name, dot: r.dot, core: r.core };
}

export function mapSubtask(r: SubtaskRow): Subtask {
  return { id: r.id, text: r.text, done: r.done };
}

export function mapComment(r: CommentRow): Comment {
  return { id: r.id, by: r.author, text: r.body, time: timeAgo(r.created_at) };
}

export function mapTalkingPoint(r: TalkingPointRow): TalkingPoint {
  return { id: r.id, text: r.text, taskId: r.task_id, done: r.done, position: r.position };
}

export function assembleBoard(
  boardId: string,
  name: string,
  catRows: CategoryRow[],
  colRows: ColumnRow[],
  taskRows: TaskRow[],
  subRows: SubtaskRow[],
  commentRows: CommentRow[],
  depRows: DepRow[],
  pointRows: TalkingPointRow[] = [],
): BoardData {
  const cats = [...catRows].sort((a, b) => a.position - b.position).map(mapCategory);
  const columns = [...colRows].sort((a, b) => a.position - b.position).map(mapColumn);
  const points = [...pointRows].sort((a, b) => a.position - b.position).map(mapTalkingPoint);
  const catName = new Map(catRows.map((c) => [c.id, c.name]));

  const subsByTask = new Map<string, Subtask[]>();
  [...subRows]
    .sort((a, b) => a.position - b.position)
    .forEach((s) => {
      const arr = subsByTask.get(s.task_id) || [];
      arr.push(mapSubtask(s));
      subsByTask.set(s.task_id, arr);
    });

  const commentsByTask = new Map<string, Comment[]>();
  [...commentRows]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((c) => {
      const arr = commentsByTask.get(c.task_id) || [];
      arr.push(mapComment(c));
      commentsByTask.set(c.task_id, arr);
    });

  const depsByTask = new Map<string, string[]>();
  depRows.forEach((d) => {
    const arr = depsByTask.get(d.task_id) || [];
    arr.push(d.depends_on_task_id);
    depsByTask.set(d.task_id, arr);
  });

  const tasks: Task[] = [...taskRows]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      id: r.id,
      boardId: r.board_id,
      text: r.text,
      status: r.status,
      pri: r.pri,
      cat: r.category_id ? catName.get(r.category_id) ?? null : null,
      due: r.due ?? "",
      est: Number(r.est) || 0,
      desc: r.description ?? "",
      repeat: (r.repeat as Task["repeat"]) ?? "none",
      completedAt: r.completed_at,
      startedAt: r.started_at,
      comments: commentsByTask.get(r.id) || [],
      deps: depsByTask.get(r.id) || [],
      subtasks: subsByTask.get(r.id) || [],
      position: r.position,
    }));

  return { id: boardId, name, tasks, cats, columns, points };
}
