import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LaneBy, Tweaks } from "@/types";
import { todayIso } from "@/domain/dates";
import { depsBlockedCount } from "@/domain/deps";
import { CORE_COLUMNS, MAX_COLUMNS } from "@/domain/board";
import { boardMarkdown } from "@/domain/markdown";
import { parseQuickAdd } from "@/domain/quickAdd";
import { currentStreak } from "@/domain/streak";
import { fmtDue } from "@/domain/dates";
import { THEMES, applyTheme, grad } from "@/domain/themes";
import { celebrate } from "@/lib/confetti";
import { qk } from "@/lib/queryClient";
import { useUI } from "@/state/uiStore";
import { usePomodoro } from "@/hooks/usePomodoro";
import { useHotkeys } from "@/hooks/useHotkeys";
import { usePreferences } from "@/data/preferences";
import { ensureStarterBoard, useBoards, useCreateBoard, useDeleteBoard, useRenameBoard } from "@/data/boards";
import { useBoardData } from "@/data/useBoardData";
import { aiComplete, aiJSON } from "@/services/ai";
import { useAuth } from "@/components/auth/AuthProvider";
import { TopBar } from "@/components/topbar/TopBar";
import { FilterBar } from "@/components/board/FilterBar";
import { Board } from "@/components/board/Board";
import { CalendarView } from "@/components/views/CalendarView";
import { Reports } from "@/components/views/Reports";
import { Detail } from "@/components/modals/Detail";
import { CategoryManager } from "@/components/modals/CategoryManager";
import { DailyBrief } from "@/components/modals/DailyBrief";
import { Help } from "@/components/modals/Help";
import { Settings } from "@/components/modals/Settings";
import { Focus } from "@/components/modals/Focus";
import { TemplatePicker } from "@/components/modals/TemplatePicker";
import { AddWithAI } from "@/components/modals/AddWithAI";
import { TalkingPoints } from "@/components/modals/TalkingPoints";
import { CommandPalette, type Command } from "@/components/modals/CommandPalette";
import { IconBoard, IconCalView, IconChart, IconCopy, IconDownload, IconGear, IconHelp, IconSpark, IconTag, IconTarget, IconWand } from "@/components/icons/Icons";

export function App() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { prefs, isLoaded: prefsLoaded, update: updatePrefs } = usePreferences();
  const { data: boards = [] } = useBoards();
  const createBoard = useCreateBoard();
  const renameBoard = useRenameBoard();
  const deleteBoard = useDeleteBoard();

  // UI store
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const filter = useUI((s) => s.filter);
  const setFilter = useUI((s) => s.setFilter);
  const query = useUI((s) => s.query);
  const dragId = useUI((s) => s.dragId);
  const setDragId = useUI((s) => s.setDragId);
  const overCol = useUI((s) => s.overCol);
  const setOverCol = useUI((s) => s.setOverCol);
  const openId = useUI((s) => s.openId);
  const setOpenId = useUI((s) => s.setOpenId);
  const modals = useUI((s) => s.modals);
  const openModal = useUI((s) => s.openModal);
  const closeModal = useUI((s) => s.closeModal);
  const flash = useUI((s) => s.flash);
  const setFlash = useUI((s) => s.setFlash);
  const toast = useUI((s) => s.toast);
  const setToast = useUI((s) => s.setToast);

  usePomodoro();
  useHotkeys();

  // apply theme + tweaks to CSS vars — but only once real preferences have loaded,
  // so we don't briefly overwrite the inline boot script's theme with the defaults
  // while the query is still in flight (that caused a flash on refresh).
  useEffect(() => {
    if (prefsLoaded) applyTheme(prefs.theme, prefs.tweaks);
  }, [prefsLoaded, prefs.theme, prefs.tweaks]);

  // refresh AI usage card when an AI action completes
  useEffect(() => {
    const h = () => queryClient.invalidateQueries({ queryKey: qk.aiUsage });
    window.addEventListener("nimbus-ai-used", h);
    return () => window.removeEventListener("nimbus-ai-used", h);
  }, [queryClient]);

  // seed a starter board on first login
  const seedingRef = useRef(false);
  useEffect(() => {
    if (boards.length === 0 && !seedingRef.current) {
      seedingRef.current = true;
      ensureStarterBoard()
        .then(() => {
          queryClient.invalidateQueries({ queryKey: qk.boards });
          queryClient.invalidateQueries({ queryKey: qk.preferences });
        })
        .catch((e) => console.error("[Nimbus] seed failed:", e))
        .finally(() => {
          seedingRef.current = false;
        });
    }
  }, [boards.length, queryClient]);

  // resolve active board
  const activeBoardId = useMemo(() => {
    const wanted = prefs.activeBoardId;
    if (wanted && boards.some((b) => b.id === wanted)) return wanted;
    return boards[0]?.id ?? null;
  }, [prefs.activeBoardId, boards]);

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  const onFlash = useCallback(
    (ids: string[]) => {
      setFlash(ids);
      setTimeout(() => setFlash([]), 1700);
    },
    [setFlash],
  );
  const defaultCat = useCallback(() => (filter !== "All" ? filter : null), [filter]);

  const { data, actions } = useBoardData(activeBoardId, activeBoard?.name ?? "Board", {
    onCelebrate: celebrate,
    onFlash,
    defaultCat,
  });

  const tasks = data?.tasks ?? [];
  const cats = data?.cats ?? [];
  const columns = data?.columns ?? CORE_COLUMNS;
  const points = data?.points ?? [];
  const wipLimit = prefs.wipLimit;
  const laneBy = prefs.laneBy;

  // Talking points: which cards are pinned, and a fast task lookup for source chips.
  const pinnedSet = useMemo(() => new Set(points.filter((p) => p.taskId).map((p) => p.taskId as string)), [points]);
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  // derived
  const matches = (x: { cat: string | null; text: string }) =>
    (filter === "All" || x.cat === filter) && x.text.toLowerCase().includes(query.toLowerCase());
  const byCol: Record<string, typeof tasks> = {};
  columns.forEach((c) => {
    byCol[c.key] = tasks.filter((x) => x.status === c.key && matches(x));
  });
  const visibleCount = tasks.filter(matches).length;
  const doneCount = (byCol["done"] || []).length;
  const streak = currentStreak(tasks);
  const pct = visibleCount ? Math.round((doneCount / visibleCount) * 100) : 0;
  const openCount = visibleCount - doneCount;
  const catNames = cats.map((c) => c.name);
  const counts: Record<string, number> = {};
  ["All", ...catNames].forEach((c) => {
    counts[c] = tasks.filter((x) => (c === "All" || x.cat === c) && x.status !== "done").length;
  });

  // board switching
  const switchBoard = (id: string) => {
    if (id === activeBoardId) return;
    updatePrefs({ activeBoardId: id });
    setFilter("All");
    setView("board");
  };
  const addBoard = () => createBoard.mutate("New board", { onSuccess: (id) => switchBoard(id) });
  const handleDeleteBoard = (id: string) => {
    if (boards.length <= 1) {
      // never leave the user boardless: create a fresh empty board, then delete this one
      createBoard.mutate("My Board", {
        onSuccess: (newId) => {
          updatePrefs({ activeBoardId: newId });
          setFilter("All");
          setView("board");
          deleteBoard.mutate(id);
        },
      });
      return;
    }
    const nextId = boards.find((b) => b.id !== id)?.id ?? null;
    deleteBoard.mutate(id);
    if (id === activeBoardId) {
      updatePrefs({ activeBoardId: nextId });
      setFilter("All");
      setView("board");
    }
  };

  // drag & drop
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  };
  const onDragEnd = () => {
    setDragId(null);
    setOverCol(null);
  };
  const onReorder = (colKey: string, idx: number) => {
    if (dragId) actions.reorder(colKey, idx, dragId);
    setDragId(null);
    setOverCol(null);
  };

  const openTask = (id: string) => setOpenId(id);
  const addBlankTask = () => setOpenId(actions.addBlankTask());
  const addFromTemplate: typeof actions.addFromTemplate = (tp) => {
    const id = actions.addFromTemplate(tp);
    setOpenId(id);
    return id;
  };

  const exportBoard = () => {
    try {
      navigator.clipboard.writeText(boardMarkdown(tasks, columns));
    } catch {
      /* ignore */
    }
  };

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  };

  // Talking points
  const onPin = (task: { id: string; text: string }) => {
    const res = actions.togglePin(task);
    showToast(res === "added" ? "Added to talking points" : "Removed from talking points");
  };
  const onJumpToCard = (taskId: string) => {
    closeModal("talkingPoints");
    setOpenId(taskId);
  };
  const onMakeTaskFromPoint = (id: string) => {
    const colName = actions.makeTaskFromPoint(id);
    if (colName) showToast(`Task created in "${colName}" ✨`);
  };

  const applyAICommand = async (q: string) => {
    showToast("Working on it…");
    try {
      const colKeys = columns.map((c) => c.key + " (" + c.name + ")").join(", ");
      const catList = cats.map((c) => c.name).join(", ");
      const summary = tasks
        .filter((t) => t.status !== "done" || t.completedAt === todayIso())
        .slice(0, 60)
        .map((t) => `${t.id}: "${t.text}" [status=${t.status}, pri=${t.pri}, cat=${t.cat || "-"}, due=${t.due || "-"}]`)
        .join("\n");
      const prompt = `Today is ${todayIso()}. You control a kanban board. Given the user's request, return ONLY a JSON array of operations to perform. Allowed ops:
{"op":"move","id":"<id>","status":"<one of: ${colKeys}>"}
{"op":"priority","id":"<id>","value":"high|med|low"}
{"op":"due","id":"<id>","value":"YYYY-MM-DD"}  (use "" to clear)
{"op":"category","id":"<id>","value":"one of: ${catList}"}
{"op":"complete","id":"<id>"}
{"op":"delete","id":"<id>"}
{"op":"create","title":"...","status":"todo","pri":"med","cat":"","due":""}
Only include ops that clearly match the request. Use real task ids from the list.
TASKS:\n${summary}\n\nREQUEST: ${q}`;
      const ops = await aiJSON<Array<Record<string, string>>>(prompt, 800, "command");
      if (!Array.isArray(ops) || !ops.length) {
        showToast("Couldn't turn that into board changes.");
        return;
      }
      const validStatus = new Set(columns.map((c) => c.key));
      const byId = new Map(tasks.map((t) => [t.id, t]));
      let n = 0;
      ops.forEach((o) => {
        if (o.op === "create" && o.title) {
          actions.addTask(
            validStatus.has(o.status) ? o.status : "todo",
            String(o.title),
            ["high", "med", "low"].includes(o.pri) ? (o.pri as "high" | "med" | "low") : "med",
            cats.find((c) => c.name === o.cat) ? o.cat : null,
            /^\d{4}-\d{2}-\d{2}$/.test(o.due || "") ? o.due : null,
          );
          n++;
          return;
        }
        if (!byId.has(o.id)) return;
        if (o.op === "move" && validStatus.has(o.status)) { actions.updateTask(o.id, { status: o.status }); n++; }
        else if (o.op === "priority" && ["high", "med", "low"].includes(o.value)) { actions.updateTask(o.id, { pri: o.value as "high" | "med" | "low" }); n++; }
        else if (o.op === "due") { actions.updateTask(o.id, { due: /^\d{4}-\d{2}-\d{2}$/.test(o.value || "") ? o.value : "" }); n++; }
        else if (o.op === "category" && cats.find((c) => c.name === o.value)) { actions.updateTask(o.id, { cat: o.value }); n++; }
        else if (o.op === "complete") { actions.updateTask(o.id, { status: "done" }); n++; }
        else if (o.op === "delete") { actions.del(o.id); n++; }
      });
      showToast(n ? `Done — applied ${n} change${n === 1 ? "" : "s"} ✨` : "Nothing matched that request.");
    } catch {
      showToast("AI isn't available — check Settings.");
    }
  };

  const planMyDay = async () => {
    const actionable = tasks.filter((t) => t.status === "todo" && depsBlockedCount(t, tasks) === 0);
    if (!actionable.length) return;
    try {
      const prompt = `Order these to-do tasks into the best sequence for today, considering priority and due dates. Reply with ONLY the task titles, one per line, in the order to do them — no numbering or extra text.\n${actionable
        .map((t) => `${t.text} (${t.pri}${t.due ? ", due " + (fmtDue(t.due)?.label || t.due) : ""})`)
        .join("\n")}`;
      const out = await aiComplete(prompt, 300, "plan-day");
      const order = (out || "")
        .split(/\n+/)
        .map((s) => s.replace(/^[\s\-•*\d.)]+/, "").trim().toLowerCase())
        .filter(Boolean);
      if (order.length) {
        const rank = (text: string) => {
          const i = order.findIndex((o) => o === text.toLowerCase() || o.includes(text.toLowerCase()) || text.toLowerCase().includes(o));
          return i < 0 ? 999 : i;
        };
        const orderedIds = [...tasks.filter((t) => t.status === "todo")].sort((a, b) => rank(a.text) - rank(b.text)).map((t) => t.id);
        actions.setTodoOrder(orderedIds);
        onFlash(actionable.map((t) => t.id));
      }
    } catch {
      /* ignore */
    }
  };

  const openTaskObj = openId != null ? tasks.find((x) => x.id === openId) : undefined;

  const commands: Command[] = [
    { label: "Go to Board", icon: <IconBoard />, kw: "view board", run: () => setView("board") },
    { label: "Go to Reports", icon: <IconChart s={15} />, kw: "view reports metrics insight", run: () => setView("reports") },
    { label: "Calendar view", icon: <IconCalView s={15} />, kw: "calendar month due dates", run: () => setView("calendar") },
    { label: "Start focus session", icon: <IconTarget s={15} />, kw: "focus pomodoro timer", run: () => openModal("focus") },
    { label: "New from template", icon: <IconCopy />, kw: "template bug feature meeting", run: () => openModal("templates") },
    { label: "Add tasks with AI", icon: <IconSpark />, sub: "AI", kw: "ai brain dump paste notes transcript extract", run: () => openModal("addWithAI") },
    { label: "Open the Brief", icon: <IconWand s={15} />, kw: "standup sprint recap triage ai", run: () => openModal("brief") },
    { label: "Plan my day with AI", icon: <IconSpark />, sub: "AI", kw: "plan order schedule ai", run: () => planMyDay() },
    { label: "Manage categories", icon: <IconTag />, kw: "lists rename color", run: () => openModal("manageCats") },
    { label: "Export board to Markdown", icon: <IconDownload />, sub: "copied", kw: "export markdown copy share", run: () => exportBoard() },
    { label: "Settings", icon: <IconGear s={15} />, kw: "key byok wip api", run: () => openModal("settings") },
    { label: "Help", icon: <IconHelp s={15} />, kw: "how guide tour", run: () => openModal("help") },
    ...THEMES.map((th, i) => ({
      label: "Theme: " + th.name,
      icon: <span style={{ width: 15, height: 15, borderRadius: "50%", background: grad(th.bg), display: "block" }}></span>,
      kw: "theme color backdrop look",
      run: () => updatePrefs({ theme: i, tweaks: { ...prefs.tweaks, accent: THEMES[i].accent } }),
    })),
  ];

  return (
    <div className="stage">
      {toast && (
        <div className="ai-toast">
          <IconSpark />
          {toast}
        </div>
      )}

      <TopBar
        pct={pct}
        openCount={openCount}
        doneCount={doneCount}
        streak={streak}
        boards={boards}
        activeBoardId={activeBoardId}
        onSwitchBoard={switchBoard}
        onAddBoard={addBoard}
        onRenameBoard={(id, name) => renameBoard.mutate({ id, name })}
        onDeleteBoard={handleDeleteBoard}
        theme={prefs.theme}
        onSelectTheme={(i) => updatePrefs({ theme: i, tweaks: { ...prefs.tweaks, accent: THEMES[i].accent } })}
        laneBy={laneBy}
        onLaneBy={(l: LaneBy) => updatePrefs({ laneBy: l })}
        pointsCount={points.length}
      />

      {!data ? (
        /* Board still loading — render an empty spacer (not CORE_COLUMNS) so custom
           columns don't flicker in after the real data arrives on refresh. */
        <div style={{ flex: 1 }} />
      ) : view === "board" ? (
        <>
          <FilterBar
            catNames={catNames}
            counts={counts}
            filter={filter}
            onFilter={setFilter}
            onManage={() => openModal("manageCats")}
            onAddTask={addBlankTask}
            onAddColumn={actions.addColumn}
            canAddColumn={columns.length < MAX_COLUMNS}
          />
          <Board
            columns={columns}
            byCol={byCol}
            allTasks={tasks}
            cats={cats}
            dragId={dragId}
            overCol={overCol}
            flash={flash}
            wipLimit={wipLimit}
            laneBy={laneBy}
            onMoveCol={actions.moveColumn}
            onRenameCol={actions.renameColumn}
            onDeleteCol={actions.deleteColumn}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onReorder={onReorder}
            onDragEnterCol={setOverCol}
            onDragLeaveCol={(k) => setOverCol(overCol === k ? null : overCol)}
            onAdd={actions.addTask}
            onDelete={actions.del}
            onCyclePri={actions.cyclePri}
            onOpen={openTask}
            pinnedSet={pinnedSet}
            onPin={onPin}
          />
        </>
      ) : view === "calendar" ? (
        <CalendarView tasks={tasks} onOpen={openTask} />
      ) : (
        <Reports tasks={tasks} cats={cats} wip={tasks.filter((x) => x.status === "doing").length} />
      )}

      {openTaskObj && (
        <Detail
          t={openTaskObj}
          cats={cats}
          columns={columns}
          allTasks={tasks}
          boards={boards}
          boardId={activeBoardId}
          onOpen={openTask}
          onClose={() => setOpenId(null)}
          onUpdate={actions.updateTask}
          onMoveBoard={(taskId, targetId) => {
            actions.moveTaskToBoard(taskId, targetId);
            const tb = boards.find((b) => b.id === targetId);
            showToast(`Moved to "${tb?.name ?? "board"}" ✨`);
            setOpenId(null);
          }}
          onAddComment={actions.addComment}
        />
      )}

      {modals.manageCats && (
        <CategoryManager
          cats={cats}
          counts={counts}
          onClose={() => closeModal("manageCats")}
          onRename={actions.renameCat}
          onRecolor={actions.recolorCat}
          onAdd={actions.addCat}
          onDelete={actions.deleteCat}
        />
      )}

      {modals.brief && <DailyBrief tasks={tasks} onClose={() => closeModal("brief")} />}
      {modals.help && <Help onClose={() => closeModal("help")} />}
      {modals.settings && (
        <Settings
          wipLimit={wipLimit}
          setWipLimit={(n) => updatePrefs({ wipLimit: n })}
          onExport={exportBoard}
          tweaks={prefs.tweaks}
          setTweak={(key: keyof Tweaks, value) => updatePrefs({ tweaks: { ...prefs.tweaks, [key]: value } })}
          onSignOut={signOut}
          userEmail={user?.email}
          onClose={() => closeModal("settings")}
        />
      )}
      {modals.focus && (
        <Focus
          tasks={tasks}
          onClose={() => closeModal("focus")}
          onComplete={(id) => actions.updateTask(id, { status: "done" })}
          onOpen={(id) => { closeModal("focus"); setOpenId(id); }}
        />
      )}
      {modals.templates && <TemplatePicker onPick={addFromTemplate} onClose={() => closeModal("templates")} />}
      {modals.addWithAI && <AddWithAI cats={cats} onAdd={actions.addTaskObj} onClose={() => closeModal("addWithAI")} />}
      {modals.talkingPoints && (
        <TalkingPoints
          boardName={activeBoard?.name ?? "Board"}
          points={points}
          tasksById={tasksById}
          onClose={() => closeModal("talkingPoints")}
          onAdd={actions.addPoint}
          onToggle={actions.togglePointDone}
          onEdit={actions.editPoint}
          onDelete={actions.deletePoint}
          onReorder={actions.reorderPoints}
          onClear={actions.clearPoints}
          onJump={onJumpToCard}
          onMakeTask={onMakeTaskFromPoint}
        />
      )}
      {modals.palette && (
        <CommandPalette
          commands={commands}
          tasks={tasks}
          columns={columns}
          onQuickAdd={(text) => {
            const p = parseQuickAdd(text, cats);
            actions.addTask("todo", p.text || text, p.pri, p.cat, p.due);
          }}
          onAICommand={applyAICommand}
          onOpenTask={openTask}
          onClose={() => closeModal("palette")}
        />
      )}
    </div>
  );
}
