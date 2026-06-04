/* Board controller: loads a board's full working set into the React Query cache
 * and exposes optimistic actions (mirroring the prototype's App handlers) that
 * patch the cache immediately and persist to Postgres. On any persistence error
 * the board query is invalidated to resync with the server. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { qk } from "@/lib/queryClient";
import type { BoardData, Category, Priority, Task } from "@/types";
import { todayIso } from "@/domain/dates";
import { bumpToTop, newlyUnblocked } from "@/domain/deps";
import { PRI_CYCLE } from "@/domain/priority";
import { recurClone } from "@/domain/recurrence";
import { CAT_PALETTE, CORE_COLUMNS } from "@/domain/board";
import type { Template } from "@/domain/templates";
import * as repo from "./boardRepo";

const uid = () => crypto.randomUUID();

/** Done's signature green — reserved for the Done column, never reused. */
const DONE_GREEN = CORE_COLUMNS.find((c) => c.key === "done")!.dot;

export interface BoardActions {
  addTask: (status: string, text: string, pri: Priority | null, cat: string | null, due: string | null) => void;
  addTaskObj: (o: { text: string; status?: string; pri?: Priority; cat?: string | null; due?: string; est?: number; desc?: string }) => void;
  addBlankTask: () => string;
  addFromTemplate: (tp: Template) => string;
  del: (id: string) => void;
  cyclePri: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  addComment: (id: string, text: string) => void;
  reorder: (colKey: string, idx: number, dragId: string) => void;
  setTodoOrder: (orderedIds: string[]) => void;
  renameCat: (id: string, name: string) => void;
  recolorCat: (id: string, color: string) => void;
  addCat: () => void;
  deleteCat: (id: string) => void;
  addColumn: () => void;
  moveColumn: (key: string, dir: number) => void;
  renameColumn: (key: string, name: string) => void;
  deleteColumn: (key: string) => void;
}

interface Options {
  onCelebrate?: () => void;
  onFlash?: (ids: string[]) => void;
  defaultCat?: () => string | null;
}

export function useBoardData(boardId: string | null, name: string, opts: Options = {}) {
  const queryClient = useQueryClient();
  const { onCelebrate, onFlash, defaultCat } = opts;

  const query = useQuery({
    queryKey: boardId ? qk.board(boardId) : ["board", "none"],
    queryFn: () => repo.fetchBoardData(boardId!, name),
    enabled: !!boardId,
  });

  const actions = useMemo<BoardActions>(() => {
    const key = boardId ? qk.board(boardId) : (["board", "none"] as const);
    const current = () => queryClient.getQueryData<BoardData>(key);
    const setBoard = (fn: (b: BoardData) => BoardData) =>
      queryClient.setQueryData<BoardData>(key, (old) => (old ? fn(old) : old));
    const resync = () => {
      if (boardId) queryClient.invalidateQueries({ queryKey: qk.board(boardId) });
    };
    const persist = (p: Promise<unknown>) => {
      p.catch((e) => {
        console.error("[Nimbus] persistence error:", e);
        resync();
      });
    };
    const catIdByName = (n: string | null | undefined): string | null =>
      n ? current()?.cats.find((c) => c.name === n)?.id ?? null : null;

    const taskInsertRow = (t: Task) => ({
      id: t.id,
      board_id: boardId!,
      text: t.text,
      status: t.status,
      pri: t.pri,
      category_id: catIdByName(t.cat),
      due: t.due || null,
      est: t.est,
      description: t.desc,
      repeat: t.repeat && t.repeat !== "none" ? t.repeat : null,
      started_at: t.startedAt || null,
      completed_at: t.completedAt || null,
      position: t.position,
    });

    const scalarPatchRow = (patch: Partial<Task>): Record<string, unknown> => {
      const row: Record<string, unknown> = {};
      if ("text" in patch) row.text = patch.text;
      if ("pri" in patch) row.pri = patch.pri;
      if ("cat" in patch) row.category_id = catIdByName(patch.cat);
      if ("due" in patch) row.due = patch.due || null;
      if ("est" in patch) row.est = patch.est;
      if ("desc" in patch) row.description = patch.desc;
      if ("repeat" in patch) row.repeat = patch.repeat && patch.repeat !== "none" ? patch.repeat : null;
      if ("status" in patch) row.status = patch.status;
      if ("startedAt" in patch) row.started_at = patch.startedAt || null;
      if ("completedAt" in patch) row.completed_at = patch.completedAt || null;
      if ("position" in patch) row.position = patch.position;
      return row;
    };

    /** Assign position=index to every task; return the renumbered list and the
     * subset whose position/status changed (so callers persist only the diff). */
    const renumber = (prev: Task[], next: Task[]) => {
      const renum = next.map((t, i) => ({ ...t, position: i }));
      const prevById = new Map(prev.map((t) => [t.id, t]));
      const changed = renum
        .filter((t) => {
          const p = prevById.get(t.id);
          return !p || p.position !== t.position || p.status !== t.status;
        })
        .map((t) => ({ id: t.id, position: t.position, status: t.status }));
      return { renum, changed };
    };

    const blankTask = (over: Partial<Task>): Task => ({
      id: uid(),
      boardId: boardId!,
      text: "",
      status: "todo",
      pri: "med",
      cat: defaultCat?.() ?? current()?.cats[0]?.name ?? null,
      due: "",
      est: 0,
      desc: "",
      repeat: "none",
      completedAt: null,
      startedAt: null,
      comments: [],
      deps: [],
      subtasks: [],
      position: 0,
      ...over,
    });

    const addTask: BoardActions["addTask"] = (status, text, pri, cat, due) => {
      const t = blankTask({
        status,
        text,
        pri: pri || "med",
        cat: cat ?? defaultCat?.() ?? current()?.cats[0]?.name ?? null,
        due: due || "",
        startedAt: status === "doing" ? todayIso() : null,
        completedAt: status === "done" ? todayIso() : null,
      });
      setBoard((b) => {
        t.position = b.tasks.length;
        return { ...b, tasks: [...b.tasks, t] };
      });
      persist(repo.insertTaskRow(taskInsertRow(t)));
    };

    const addTaskObj: BoardActions["addTaskObj"] = (o) => {
      const t = blankTask({
        text: o.text,
        status: o.status || "todo",
        pri: o.pri || "med",
        cat: o.cat ?? defaultCat?.() ?? current()?.cats[0]?.name ?? null,
        due: o.due || "",
        est: o.est || 0,
        desc: o.desc || "",
      });
      setBoard((b) => {
        t.position = b.tasks.length;
        return { ...b, tasks: [...b.tasks, t] };
      });
      persist(repo.insertTaskRow(taskInsertRow(t)));
    };

    const addBlankTask: BoardActions["addBlankTask"] = () => {
      const t = blankTask({ position: -1 });
      setBoard((b) => ({ ...b, tasks: [t, ...b.tasks] }));
      persist(repo.insertTaskRow(taskInsertRow(t)));
      return t.id;
    };

    const addFromTemplate: BoardActions["addFromTemplate"] = (tp) => {
      const id = uid();
      const t = blankTask({
        id,
        text: tp.title || tp.name,
        pri: tp.pri || "med",
        desc: tp.desc || "",
        position: -1,
        subtasks: (tp.subs || []).map((s) => ({ id: uid(), text: s, done: false })),
      });
      setBoard((b) => ({ ...b, tasks: [t, ...b.tasks] }));
      persist(repo.insertTaskRow(taskInsertRow(t)));
      if (t.subtasks.length) persist(repo.reconcileSubtasks(id, t.subtasks));
      return id;
    };

    const del: BoardActions["del"] = (id) => {
      setBoard((b) => ({ ...b, tasks: b.tasks.filter((x) => x.id !== id) }));
      persist(repo.deleteTaskRow(id));
    };

    const cyclePri: BoardActions["cyclePri"] = (id) => {
      let nextPri: Priority | null = null;
      setBoard((b) => ({
        ...b,
        tasks: b.tasks.map((x) => {
          if (x.id !== id) return x;
          nextPri = PRI_CYCLE[x.pri];
          return { ...x, pri: nextPri };
        }),
      }));
      if (nextPri) persist(repo.updateTaskRow(id, { pri: nextPri }));
    };

    const updateTask: BoardActions["updateTask"] = (id, patch) => {
      const b = current();
      if (!b) return;
      const was = b.tasks.find((x) => x.id === id);
      if (!was) return;

      let p: Partial<Task> = patch;
      if (patch.status) {
        p = {
          ...patch,
          completedAt: patch.status === "done" ? todayIso() : null,
          startedAt: patch.status === "doing" && !was.startedAt ? todayIso() : was.startedAt,
        };
      }
      let next = b.tasks.map((x) => (x.id === id ? { ...x, ...p } : x));

      const enteringDone = p.status === "done" && was.status !== "done";
      let clone: Task | null = null;
      let unblocked: string[] = [];
      if (enteringDone) {
        if (was.repeat && was.repeat !== "none") {
          clone = recurClone(was, uid());
          clone.position = next.length;
          next = [...next, clone];
        }
        unblocked = newlyUnblocked(next, id);
        if (unblocked.length) {
          next = bumpToTop(next, unblocked);
          onFlash?.(unblocked);
        }
        onCelebrate?.();
      }

      // commit cache (renumber so positions reflect any bump/clone)
      const { renum, changed } = renumber(b.tasks, next);
      setBoard(() => ({ ...b, tasks: renum }));

      // persist scalar field changes
      const row = scalarPatchRow(p);
      if (Object.keys(row).length) persist(repo.updateTaskRow(id, row));
      if ("subtasks" in patch && patch.subtasks) persist(repo.reconcileSubtasks(id, patch.subtasks));
      if ("deps" in patch && patch.deps) persist(repo.reconcileDeps(id, patch.deps));
      // insert the recurrence clone first, THEN persist positions (chained to avoid a race)
      if (clone) {
        const cloneRow = taskInsertRow(clone);
        persist(repo.insertTaskRow(cloneRow).then(() => (changed.length ? repo.updateTaskPositions(changed) : undefined)));
      } else if (enteringDone && unblocked.length && changed.length) {
        persist(repo.updateTaskPositions(changed));
      }
    };

    const addComment: BoardActions["addComment"] = (id, text) => {
      const cid = uid();
      setBoard((b) => ({
        ...b,
        tasks: b.tasks.map((x) => (x.id === id ? { ...x, comments: [...x.comments, { id: cid, by: "You", time: "just now", text }] } : x)),
      }));
      persist(repo.insertCommentRow(cid, id, text));
    };

    const reorder: BoardActions["reorder"] = (colKey, idx, dragId) => {
      const b = current();
      if (!b || dragId == null) return;
      const dragged = b.tasks.find((t) => t.id === dragId);
      if (!dragged) return;
      const disp = b.tasks.filter((t) => t.status === colKey);
      let beforeId = disp[idx] ? disp[idx].id : null;
      if (beforeId === dragId) beforeId = disp[idx + 1] ? disp[idx + 1].id : null;

      const enteringDone = colKey === "done" && dragged.status !== "done";
      const colChanged = dragged.status !== colKey;
      const moved: Task = {
        ...dragged,
        status: colKey,
        completedAt: colKey === "done" ? dragged.completedAt || todayIso() : null,
        startedAt: colKey === "doing" && !dragged.startedAt ? todayIso() : dragged.startedAt,
      };
      let rest = b.tasks.filter((t) => t.id !== dragId);
      if (beforeId) {
        const bi = rest.findIndex((t) => t.id === beforeId);
        rest.splice(bi, 0, moved);
      } else {
        let li = -1;
        rest.forEach((t, i) => {
          if (t.status === colKey) li = i;
        });
        if (li < 0) rest.push(moved);
        else rest.splice(li + 1, 0, moved);
      }

      let clone: Task | null = null;
      if (enteringDone) {
        if (dragged.repeat && dragged.repeat !== "none") {
          clone = recurClone(dragged, uid());
          rest = [...rest, clone];
        }
        const ub = newlyUnblocked(rest, dragId);
        if (ub.length) {
          rest = bumpToTop(rest, ub);
          onFlash?.(ub);
        }
        onCelebrate?.();
      }

      const { renum, changed } = renumber(b.tasks, rest);
      setBoard(() => ({ ...b, tasks: renum }));
      // updateTaskPositions only writes position + status; persist the
      // completion/start timestamps separately when the column changed, else a
      // drag into Done leaves completed_at null in the DB (lost on refresh).
      if (colChanged) {
        persist(repo.updateTaskRow(dragId, { completed_at: moved.completedAt || null, started_at: moved.startedAt || null }));
      }
      if (clone) {
        const cloneRow = taskInsertRow(clone);
        persist(repo.insertTaskRow(cloneRow).then(() => (changed.length ? repo.updateTaskPositions(changed) : undefined)));
      } else if (changed.length) {
        persist(repo.updateTaskPositions(changed));
      }
    };

    const setTodoOrder: BoardActions["setTodoOrder"] = (orderedIds) => {
      const b = current();
      if (!b) return;
      const rank = new Map(orderedIds.map((id, i) => [id, i]));
      const todo = b.tasks.filter((t) => t.status === "todo").sort((a, c) => (rank.get(a.id) ?? 999) - (rank.get(c.id) ?? 999));
      const others = b.tasks.filter((t) => t.status !== "todo");
      const next = [...todo, ...others];
      const { renum, changed } = renumber(b.tasks, next);
      setBoard(() => ({ ...b, tasks: renum }));
      if (changed.length) persist(repo.updateTaskPositions(changed));
    };

    /* ---- categories ---- */
    const renameCat: BoardActions["renameCat"] = (id, name) => {
      const b = current();
      if (!b) return;
      const old = b.cats.find((c) => c.id === id)?.name;
      setBoard((bd) => ({
        ...bd,
        cats: bd.cats.map((c) => (c.id === id ? { ...c, name } : c)),
        tasks: old != null ? bd.tasks.map((t) => (t.cat === old ? { ...t, cat: name } : t)) : bd.tasks,
      }));
      persist(repo.updateCategoryRow(id, { name }));
    };
    const recolorCat: BoardActions["recolorCat"] = (id, color) => {
      setBoard((b) => ({ ...b, cats: b.cats.map((c) => (c.id === id ? { ...c, color } : c)) }));
      persist(repo.updateCategoryRow(id, { color }));
    };
    const addCat: BoardActions["addCat"] = () => {
      const b = current();
      if (!b) return;
      const used = b.cats.map((c) => c.color);
      const color = CAT_PALETTE.find((c) => !used.includes(c)) || CAT_PALETTE[b.cats.length % CAT_PALETTE.length];
      const cat: Category = { id: uid(), name: "New list", color };
      setBoard((bd) => ({ ...bd, cats: [...bd.cats, cat] }));
      persist(repo.insertCategoryRow({ id: cat.id, board_id: boardId!, name: cat.name, color, position: b.cats.length }));
    };
    const deleteCat: BoardActions["deleteCat"] = (id) => {
      const b = current();
      if (!b || b.cats.length <= 1) return;
      const gone = b.cats.find((c) => c.id === id);
      const rest = b.cats.filter((c) => c.id !== id);
      const firstId = rest[0].id;
      const reassigned: string[] = [];
      setBoard((bd) => ({
        ...bd,
        cats: rest,
        tasks: gone
          ? bd.tasks.map((t) => {
              if (t.cat === gone.name) {
                reassigned.push(t.id);
                return { ...t, cat: rest[0].name };
              }
              return t;
            })
          : bd.tasks,
      }));
      persist(repo.deleteCategoryRow(id));
      reassigned.forEach((tid) => persist(repo.updateTaskRow(tid, { category_id: firstId })));
    };

    /* ---- columns ---- */
    const addColumn: BoardActions["addColumn"] = () => {
      const b = current();
      if (!b) return;
      const colKey = "col_" + uid();
      // Pick the first palette color not already used by a column, so each new
      // column gets a distinct underline. Green is reserved for Done, so it's
      // excluded from the choices for any other column.
      const palette = CAT_PALETTE.filter((c) => c !== DONE_GREEN);
      const used = new Set(b.columns.map((c) => c.dot));
      const dot = palette.find((c) => !used.has(c)) || palette[b.columns.length % palette.length];
      const col = { key: colKey, name: "New stage", dot, core: false };
      const di = b.columns.findIndex((c) => c.key === "done");
      const cols = b.columns.slice();
      if (di < 0) cols.push(col);
      else cols.splice(di, 0, col);
      setBoard((bd) => ({ ...bd, columns: cols }));
      persist(repo.insertColumnRow({ id: uid(), board_id: boardId!, key: colKey, name: col.name, dot: col.dot, core: false, position: di < 0 ? cols.length - 1 : di }));
      persist(repo.setColumnPositions(boardId!, cols.map((c, i) => ({ key: c.key, position: i }))));
    };
    const moveColumn: BoardActions["moveColumn"] = (colKey, dir) => {
      const b = current();
      if (!b) return;
      const i = b.columns.findIndex((c) => c.key === colKey);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= b.columns.length) return;
      const cols = b.columns.slice();
      [cols[i], cols[j]] = [cols[j], cols[i]];
      setBoard((bd) => ({ ...bd, columns: cols }));
      persist(repo.setColumnPositions(boardId!, cols.map((c, idx) => ({ key: c.key, position: idx }))));
    };
    const renameColumn: BoardActions["renameColumn"] = (colKey, name) => {
      setBoard((b) => ({ ...b, columns: b.columns.map((c) => (c.key === colKey ? { ...c, name } : c)) }));
      persist(repo.updateColumnByKey(boardId!, colKey, { name }));
    };
    const deleteColumn: BoardActions["deleteColumn"] = (colKey) => {
      const b = current();
      if (!b || b.columns.length <= 1) return;
      const rest = b.columns.filter((c) => c.key !== colKey);
      const firstKey = rest[0].key;
      const moved: string[] = [];
      setBoard((bd) => ({
        ...bd,
        columns: rest,
        tasks: bd.tasks.map((t) => {
          if (t.status === colKey) {
            moved.push(t.id);
            return { ...t, status: firstKey };
          }
          return t;
        }),
      }));
      moved.forEach((tid) => persist(repo.updateTaskRow(tid, { status: firstKey })));
      persist(repo.deleteColumnByKey(boardId!, colKey));
    };

    return {
      addTask, addTaskObj, addBlankTask, addFromTemplate, del, cyclePri, updateTask, addComment,
      reorder, setTodoOrder, renameCat, recolorCat, addCat, deleteCat, addColumn, moveColumn, renameColumn, deleteColumn,
    };
  }, [boardId, queryClient, onCelebrate, onFlash, defaultCat]);

  return { ...query, actions };
}
