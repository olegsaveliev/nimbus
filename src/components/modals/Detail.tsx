import { useState } from "react";
import type { Board, Category, Column, Priority, Repeat, Task } from "@/types";
import { EST_OPTIONS } from "@/domain/estimate";
import { wouldCycle } from "@/domain/deps";
import { CORE_COLUMNS } from "@/domain/board";
import { IconBoard, IconChat, IconChevDown, IconInfo, IconLink, IconPlus, IconRepeat, IconSend, IconSpark, IconTick, IconWand } from "@/components/icons/Icons";
import { Overlay } from "@/components/common/Overlay";
import { LiveInput, LiveTextarea } from "@/components/common/LiveField";
import { avColor, initials } from "@/domain/board";
import { aiComplete, aiJSON } from "@/services/ai";

const uid = () => crypto.randomUUID();

interface Props {
  t: Task;
  cats: Category[];
  columns: Column[];
  allTasks: Task[];
  boards: Board[];
  boardId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onMoveBoard: (taskId: string, targetBoardId: string) => void;
  onAddComment: (id: string, text: string) => void;
}

export function Detail({ t, cats, columns, allTasks, boards, boardId, onOpen, onClose, onUpdate, onMoveBoard, onAddComment }: Props) {
  const [draft, setDraft] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [depPick, setDepPick] = useState(false);
  const [subDraft, setSubDraft] = useState("");
  const [breaking, setBreaking] = useState(false);
  const [aiBusy, setAiBusy] = useState("");
  const [aiNote, setAiNote] = useState("");

  const send = () => {
    const v = draft.trim();
    if (!v) return;
    onAddComment(t.id, v);
    setDraft("");
  };

  const depList = (t.deps || []).map((id) => (allTasks || []).find((x) => x.id === id)).filter(Boolean) as Task[];
  const blockedN = depList.filter((d) => d.status !== "done").length;
  // Inverse of "blocked by": open tasks that list this one as a prerequisite.
  const blocksList = (allTasks || []).filter((x) => x.status !== "done" && (x.deps || []).includes(t.id));
  const eligible = (allTasks || []).filter(
    (x) => x.id !== t.id && x.status !== "done" && !(t.deps || []).includes(x.id) && !wouldCycle(allTasks || [], t.id, x.id),
  );
  const setDeps = (arr: string[]) => onUpdate(t.id, { deps: arr });
  const subs = t.subtasks || [];
  const subDone = subs.filter((s) => s.done).length;
  const setSubs = (arr: Task["subtasks"]) => onUpdate(t.id, { subtasks: arr });
  const addSub = () => {
    const v = subDraft.trim();
    if (!v) return;
    setSubs([...subs, { id: uid(), text: v, done: false }]);
    setSubDraft("");
  };

  const flashNote = (mNote: string) => {
    setAiNote(mNote);
    setTimeout(() => setAiNote(""), 2600);
  };

  const breakDown = async () => {
    setBreaking(true);
    try {
      const prompt = `Break this task into 3-6 short, concrete checklist steps someone could tick off. Task: "${t.text}".${t.desc ? " Context: " + t.desc : ""} Reply with ONLY the steps, one per line — no numbering, bullets, or preamble.`;
      const out = await aiComplete(prompt, 300, "break-down");
      const items = (out || "")
        .split(/\n+/)
        .map((s) => s.replace(/^[\s\-•*\d.)]+/, "").trim())
        .filter(Boolean)
        .slice(0, 6);
      if (items.length) setSubs([...(t.subtasks || []), ...items.map((text) => ({ id: uid(), text, done: false }))]);
    } catch {
      /* ignore */
    }
    setBreaking(false);
  };

  const suggestDetails = async () => {
    setAiBusy("details");
    try {
      const catList = cats.map((c) => c.name).join(", ");
      const out = await aiJSON<{ priority?: string; category?: string; estimate?: number }>(
        `For this task, suggest fields as JSON: {"priority":"high|med|low","category":"one of: ${catList}","estimate": hours as a number}. Task: "${t.text}".${t.desc ? " Details: " + t.desc : ""} Reply with ONLY the JSON object.`,
        700,
        "suggest-details",
      );
      if (out) {
        const patch: Partial<Task> = {};
        if (out.priority && ["high", "med", "low"].includes(out.priority)) patch.pri = out.priority as Priority;
        if (cats.find((c) => c.name === out.category)) patch.cat = out.category!;
        if (Number(out.estimate) > 0) patch.est = Number(out.estimate);
        if (Object.keys(patch).length) {
          onUpdate(t.id, patch);
          flashNote("Filled priority, category & estimate ✨");
        } else flashNote("No confident suggestions.");
      } else flashNote("AI isn't available — check Settings.");
    } catch {
      flashNote("AI isn't available — check Settings.");
    }
    setAiBusy("");
  };

  const improveTask = async () => {
    setAiBusy("improve");
    try {
      const out = await aiJSON<{ title?: string; description?: string }>(
        `Rewrite this task to be crisp and actionable. Return JSON: {"title": a clear imperative title (max ~8 words), "description": 2-4 short bullet lines of acceptance criteria using "- " prefixes}. Keep the original intent. Task: "${t.text}".${t.desc ? " Current notes: " + t.desc : ""} Reply with ONLY the JSON object.`,
        700,
        "improve",
      );
      if (out && out.title) {
        onUpdate(t.id, { text: String(out.title).trim(), desc: out.description ? String(out.description).trim() : t.desc });
        flashNote("Rewrote the title & added acceptance criteria ✨");
      } else flashNote("AI isn't available — check Settings.");
    } catch {
      flashNote("AI isn't available — check Settings.");
    }
    setAiBusy("");
  };

  const suggestBlockers = async () => {
    setAiBusy("blockers");
    try {
      if (!eligible.length) {
        flashNote("No other tasks to link.");
        setAiBusy("");
        return;
      }
      const list = eligible.map((e) => `${e.id}: ${e.text}`).join("\n");
      const out = await aiJSON<string[]>(
        `Which of these tasks likely must be finished BEFORE the target task can start? Target: "${t.text}". Candidates (id: title):\n${list}\nReply with ONLY a JSON array of the ids that are real prerequisites (empty array if none).`,
        700,
        "suggest-blockers",
      );
      if (Array.isArray(out)) {
        const valid = out.map(String).filter((id) => eligible.some((e) => e.id === id));
        if (valid.length) {
          setDeps([...(t.deps || []), ...valid]);
          flashNote(`Linked ${valid.length} blocker${valid.length === 1 ? "" : "s"} ✨`);
        } else flashNote("No prerequisites found — looks unblocked.");
      } else flashNote("AI isn't available — check Settings.");
    } catch {
      flashNote("AI isn't available — check Settings.");
    }
    setAiBusy("");
  };

  const cols = columns && columns.length ? columns : CORE_COLUMNS;

  return (
    <Overlay onClose={onClose}>
      <div className="detail glass" onClick={(e) => e.stopPropagation()}>
        <div className="detail-scroll">
          <div className="d-head">
            <div className="statusseg">
              {cols.map((c) => (
                <button key={c.key} className={t.status === c.key ? "on" : ""} onClick={() => onUpdate(t.id, { status: c.key })}>
                  <i style={{ background: c.dot }}></i>
                  {c.name}
                </button>
              ))}
            </div>
            {boards && boards.length > 1 && (
              <div className="movebrd">
                <button className="movebrd-btn" onClick={() => setMoveOpen((o) => !o)}><IconBoard s={14} />Move<IconChevDown s={12} /></button>
                {moveOpen && (
                  <>
                    <div className="movebrd-scrim" onClick={() => setMoveOpen(false)}></div>
                    <div className="movebrd-menu">
                      <div className="mb-lbl">Move to board</div>
                      {boards.filter((b) => b.id !== boardId).map((b) => (
                        <button key={b.id} className="mb-opt" onClick={() => { setMoveOpen(false); onMoveBoard(t.id, b.id); }}><IconBoard s={13} />{b.name}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <button className="d-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          <LiveInput className="d-title" value={t.text} placeholder="Name the task…" onChange={(v) => onUpdate(t.id, { text: v })} />

          <div className="ai-bar">
            <button onClick={improveTask} disabled={!!aiBusy}><IconSpark />{aiBusy === "improve" ? "Improving…" : "Improve"}</button>
            <button onClick={suggestDetails} disabled={!!aiBusy}><IconWand s={13} />{aiBusy === "details" ? "Thinking…" : "Suggest details"}</button>
            <button onClick={suggestBlockers} disabled={!!aiBusy}><IconLink s={13} />{aiBusy === "blockers" ? "Checking…" : "Suggest blockers"}</button>
          </div>
          {aiNote && <div className="ai-note">{aiNote}</div>}

          <div className="tip">
            <IconInfo />
            <span>
              <b>How this card works.</b> Fill in the details below so anyone can pick it up. Drag the card — or use the buttons above — to move it across <b>To&nbsp;Do → In&nbsp;Progress → Done</b>. Discuss it in the comments.
            </span>
          </div>

          <div className="field">
            <label>Details</label>
            <span className="hint">What does “done” look like? Add context, links, or the steps to get there.</span>
            <LiveTextarea rows={4} value={t.desc} placeholder="e.g. Pull the latest figures, update slides 3–5, send to Maya for sign-off…" onChange={(v) => onUpdate(t.id, { desc: v })} />
          </div>

          <div className="field">
            <div className="ck-head">
              <label>Checklist{subs.length > 0 && <span className="ck-count">{subDone}/{subs.length}</span>}</label>
              <button className="ck-ai" onClick={breakDown} disabled={breaking}><IconWand s={12} />{breaking ? "Thinking…" : "Break down with AI"}</button>
            </div>
            {subs.length > 0 && <div className="ck-bar"><span style={{ width: (subDone / subs.length) * 100 + "%" }}></span></div>}
            <div className="ck-list">
              {subs.map((s) => (
                <div className="ck-item" key={s.id}>
                  <button className={"ck-box" + (s.done ? " on" : "")} onClick={() => setSubs(subs.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))} aria-label="Toggle">
                    {s.done && <IconTick s={12} />}
                  </button>
                  <span className={"ck-t" + (s.done ? " done" : "")}>{s.text}</span>
                  <button className="ck-x" onClick={() => setSubs(subs.filter((x) => x.id !== s.id))} aria-label="Delete">×</button>
                </div>
              ))}
            </div>
            <div className="ck-add">
              <input value={subDraft} onChange={(e) => setSubDraft(e.target.value)} placeholder="Add a checklist item…" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }} />
              <button className="ck-addbtn" onClick={addSub} aria-label="Add"><IconPlus /></button>
            </div>
          </div>

          <div className="meta-grid">
            <div className="field">
              <label>Priority</label>
              <div className="pri-row">
                {(["high", "med", "low"] as Priority[]).map((p) => (
                  <button key={p} className={"pribtn " + p + (t.pri === p ? " sel" : "")} onClick={() => onUpdate(t.id, { pri: p })} aria-label={p}><i></i></button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Due date</label>
              <input className="d-date" type="date" value={t.due} onChange={(e) => onUpdate(t.id, { due: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <label>Estimate</label>
            <div className="rep-row">
              {EST_OPTIONS.map(([v, l]) => (
                <button key={v} className={"rep-btn" + ((t.est || 0) === parseFloat(v) ? " on" : "")} onClick={() => onUpdate(t.id, { est: parseFloat(v) })}>{l}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Category</label>
            <div className="cat-row">
              {cats.map((c) => (
                <button key={c.id} className={"chip" + (t.cat === c.name ? " active" : "")} onClick={() => onUpdate(t.id, { cat: c.name })}>{c.name}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Repeats</label>
            <div className="rep-row">
              {([["none", "Never"], ["daily", "Daily"], ["weekdays", "Weekdays"], ["weekly", "Weekly"]] as Array<[Repeat, string]>).map(([v, l]) => (
                <button key={v} className={"rep-btn" + ((t.repeat || "none") === v ? " on" : "")} onClick={() => onUpdate(t.id, { repeat: v })}>{l}</button>
              ))}
            </div>
            {t.repeat && t.repeat !== "none" && (
              <span className="hint">
                <IconRepeat s={11} /> When marked done, a fresh copy appears for the next {t.repeat === "weekly" ? "week" : t.repeat === "weekdays" ? "weekday" : "day"}.
              </span>
            )}
          </div>

          <div className="d-divider"></div>
          <div className="field">
            <label>Blocked by</label>
            {depList.length === 0 ? (
              <span className="hint">Not waiting on anything. Link tasks that must finish first.</span>
            ) : (
              <div className={"dep-state " + (blockedN > 0 ? "blocked" : "ready")}>
                {blockedN > 0 ? (
                  <>
                    <IconLink s={13} />
                    {blockedN} of {depList.length} still open — this is blocked
                  </>
                ) : (
                  <>
                    <IconTick s={14} />
                    All prerequisites done — ready to start
                  </>
                )}
              </div>
            )}
            {depList.length > 0 && (
              <div className="dep-list">
                {depList.map((d) => (
                  <div className="dep-chip" key={d.id}>
                    <span className={"ds " + (d.status === "done" ? "done" : "pending")}></span>
                    <span className="dn" onClick={() => onOpen && onOpen(d.id)} title="Open this task">{d.text}</span>
                    <button className="dx" onClick={() => setDeps((t.deps || []).filter((x) => x !== d.id))} aria-label="Unlink">×</button>
                  </div>
                ))}
              </div>
            )}
            {depPick ? (
              <div className="dep-menu">
                {eligible.length ? (
                  eligible.map((e) => (
                    <button className="dep-opt" key={e.id} onClick={() => { setDeps([...(t.deps || []), e.id]); setDepPick(false); }}>
                      <span className={"pri " + e.pri}></span>
                      <span className="do-t">{e.text}</span>
                      <span className="do-s">{cols.find((c) => c.key === e.status)?.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="dep-empty">No other tasks available to link.</div>
                )}
              </div>
            ) : (
              <button className="dep-add" onClick={() => setDepPick(true)}><IconPlus /> Add dependency</button>
            )}
          </div>

          {blocksList.length > 0 && (
            <div className="field">
              <label>Blocks</label>
              <span className="hint">
                {blocksList.length === 1 ? "This task is holding up 1 other." : `This task is holding up ${blocksList.length} others.`}
              </span>
              <div className="dep-list">
                {blocksList.map((b) => (
                  <div className="dep-chip" key={b.id}>
                    <span className={"ds " + (t.status === "done" ? "done" : "pending")}></span>
                    <span className="dn" onClick={() => onOpen && onOpen(b.id)} title="Open this task">{b.text}</span>
                    <button
                      className="dx"
                      onClick={() => onUpdate(b.id, { deps: (b.deps || []).filter((x) => x !== t.id) })}
                      aria-label="Unlink"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="d-divider"></div>

          <div className="c-head"><IconChat s={15} /> Comments <span className="pillnum">{t.comments.length}</span></div>
          <div className="c-list">
            {t.comments.length === 0 ? (
              <div className="c-empty">No comments yet — start the thread below.</div>
            ) : (
              t.comments.map((c) => (
                <div className="comment" key={c.id}>
                  <div className="avatar" style={{ background: avColor(c.by) }}>{initials(c.by)}</div>
                  <div className="c-body">
                    <div><span className="c-by">{c.by}</span><span className="c-time">{c.time}</span></div>
                    <div className="c-text">{c.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="c-add">
            <textarea rows={2} value={draft} placeholder="Add a comment…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="c-send" onClick={send} disabled={!draft.trim()} aria-label="Send"><IconSend /></button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
