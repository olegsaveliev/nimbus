/* Tasks (mobile) — the phone to-do list from the mobile design handoff: the
 * board's kanban mapped to vertical status sections (To Do / In Progress /
 * Done) that are always visible, a per-card status circle that advances the
 * task on tap, category chips, search, and a docked add bar (priority dots +
 * date + input). Reuses the desktop board's data (useBoardData via App) and
 * the shared filter/query UI state; only the shell is phone-specific. */
import { useState } from "react";
import type { BoardActions } from "@/data/useBoardData";
import type { Board, Category, Column, Priority, Task } from "@/types";
import { fmtDue } from "@/domain/dates";
import { PRI_ORDER } from "@/domain/priority";
import { useUI } from "@/state/uiStore";
import { IconCal, IconPlus, IconSearch, IconTrash, IconTick } from "@/components/icons/Icons";
import { BoardSwitcher } from "@/components/topbar/BoardSwitcher";
import { AppSeg, MiniRing, ThemeSwatch } from "./MobileBits";

interface Props {
  tasks: Task[];
  cats: Category[];
  columns: Column[];
  actions: BoardActions;
  loading: boolean;
  theme: number;
  onSelectTheme: (i: number) => void;
  onGoWishlist: () => void;
  boards: Board[];
  activeBoardId: string | null;
  onSwitchBoard: (id: string) => void;
  onAddBoard: () => void;
  onRenameBoard: (id: string, name: string) => void;
  onDeleteBoard: (id: string) => void;
}

const sortTasks = (list: Task[]) =>
  list.slice().sort((a, b) => PRI_ORDER[a.pri] - PRI_ORDER[b.pri] || (a.due || "9999").localeCompare(b.due || "9999"));

export function TasksMobile({
  tasks,
  cats,
  columns,
  actions,
  loading,
  theme,
  onSelectTheme,
  onGoWishlist,
  boards,
  activeBoardId,
  onSwitchBoard,
  onAddBoard,
  onRenameBoard,
  onDeleteBoard,
}: Props) {
  const filter = useUI((s) => s.filter);
  const setFilter = useUI((s) => s.setFilter);
  const query = useUI((s) => s.query);
  const setQuery = useUI((s) => s.setQuery);

  const [draft, setDraft] = useState("");
  const [newPri, setNewPri] = useState<Priority>("med");
  const [newDue, setNewDue] = useState("");

  const catNames = ["All", ...cats.map((c) => c.name)];
  const counts: Record<string, number> = {};
  catNames.forEach((c) => {
    counts[c] = tasks.filter((x) => (c === "All" || x.cat === c) && x.status !== "done").length;
  });

  const filtered = tasks.filter(
    (x) => (filter === "All" || x.cat === filter) && x.text.toLowerCase().includes(query.toLowerCase()),
  );
  const doneCount = tasks.filter((x) => x.status === "done").length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const eyebrow = new Date().toLocaleDateString(undefined, { weekday: "long" });

  // Tap the status circle → advance to the next column (wraps back to the
  // first). On the core board that's exactly To Do → In Progress → Done → To Do.
  const advance = (t: Task) => {
    const i = columns.findIndex((c) => c.key === t.status);
    const next = columns[(i + 1) % columns.length] ?? columns[0];
    if (next) actions.updateTask(t.id, { status: next.key });
  };

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    actions.addTask("todo", text, newPri, filter !== "All" ? filter : null, newDue || null);
    setDraft("");
    setNewDue("");
    setNewPri("med");
  };

  return (
    <div className="tdm">
      <div className="tdm-stage">
        <div className="tdm-head">
          <div className="tdm-head-top">
            <div className="tdm-greet">
              <div className="tdm-eyebrow">{eyebrow}</div>
              {/* Same switcher as the desktop top bar: tap the board name to
                  switch / rename / delete boards or add a new one. */}
              <BoardSwitcher
                boards={boards}
                activeId={activeBoardId}
                onSwitch={onSwitchBoard}
                onAdd={onAddBoard}
                onRename={onRenameBoard}
                onDelete={onDeleteBoard}
              />
              <div className="sub">
                {counts.All ?? 0} open · {doneCount} done
              </div>
            </div>
            <div className="tdm-head-actions">
              <AppSeg active="tasks" onTasks={() => {}} onWishlist={onGoWishlist} />
              <ThemeSwatch theme={theme} onSelectTheme={onSelectTheme} />
              <MiniRing pct={pct} label="done" kind="tdm" />
            </div>
          </div>
          <div className="tdm-search">
            <span className="ic">
              <IconSearch />
            </span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks…" aria-label="Search tasks" />
          </div>
          <div className="tdm-chips">
            {catNames.map((c) => (
              <button key={c} className={"tdm-chip" + (filter === c ? " on" : "")} onClick={() => setFilter(c)}>
                {c}
                {counts[c] > 0 && <span className="n">{counts[c]}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="tdm-list">
          {loading ? null : filtered.length === 0 ? (
            <div className="tdm-empty">
              <div className="em">{query ? "🔍" : "✨"}</div>
              {query ? "No matches found" : "All clear here!"}
            </div>
          ) : (
            columns.map((col) => {
              const items = sortTasks(filtered.filter((x) => x.status === col.key));
              return (
                <div className="tdm-col" key={col.key} style={{ "--cdot": col.dot } as React.CSSProperties}>
                  <div className="tdm-col-head">
                    <span className="tdm-col-dot" />
                    <span className="tdm-col-name">{col.name}</span>
                    <span className="tdm-col-n">{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <div className="tdm-col-empty">Nothing here yet</div>
                  ) : (
                    items.map((x) => {
                      const due = fmtDue(x.due);
                      return (
                        <div key={x.id} className={"tdm-task glass" + (x.status === "done" ? " done" : "")}>
                          <StatusCircle status={x.status} onClick={() => advance(x)} />
                          <div className="tdm-task-body">
                            <div className="tdm-task-txt">{x.text}</div>
                            <div className="tdm-task-meta">
                              <span className={"tdm-pri-dot " + x.pri} />
                              {due && (
                                <span className={"tdm-due" + (due.over && x.status !== "done" ? " over" : "")}>
                                  <IconCal />
                                  {due.label}
                                </span>
                              )}
                              {x.cat && <span className="tdm-cat">· {x.cat}</span>}
                            </div>
                          </div>
                          <button className="tdm-del" onClick={() => actions.del(x.id)} aria-label="Delete task">
                            <IconTrash />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="tdm-dock">
          <div className="tdm-opts">
            <span className="lbl">Priority</span>
            {(["high", "med", "low"] as const).map((p) => (
              <button key={p} className={"tdm-pribtn " + p + (newPri === p ? " sel" : "")} onClick={() => setNewPri(p)} aria-label={p + " priority"}>
                <i />
              </button>
            ))}
            <label className="tdm-datebtn">
              <IconCal />
              {newDue ? (fmtDue(newDue)?.label ?? newDue) : "Date"}
              <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} aria-label="Due date" />
            </label>
          </div>
          <div className="tdm-addrow glass">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Add a new task…"
              aria-label="Add a new task"
            />
            <button className="tdm-addbtn" onClick={add} aria-label="Add task">
              <IconPlus />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* The tap-to-advance status control: empty ring (To Do), amber ring + dot
 * (In Progress), green fill + check (Done). Custom columns get the empty ring. */
function StatusCircle({ status, onClick }: { status: string; onClick: () => void }) {
  const label =
    status === "done" ? "Done — tap for To Do" : status === "doing" ? "In Progress — tap for Done" : "To Do — tap for In Progress";
  const cls = status === "done" || status === "doing" ? " " + status : "";
  return (
    <button className={"tdm-status" + cls} onClick={onClick} aria-label={label} title={label}>
      {status === "doing" && <span className="tdm-status-dot" />}
      {status === "done" && <IconTick s={14} />}
    </button>
  );
}
