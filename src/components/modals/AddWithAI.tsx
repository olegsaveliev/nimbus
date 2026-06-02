import { useState } from "react";
import type { Category, Priority } from "@/types";
import { fmtDue, todayIso } from "@/domain/dates";
import { fmtEst } from "@/domain/estimate";
import { aiJSON, aiSource } from "@/services/ai";
import { IconPlus, IconSpark } from "@/components/icons/Icons";
import { Overlay } from "@/components/common/Overlay";

interface ExtractedItem {
  title?: string;
  priority?: string;
  category?: string;
  due?: string;
  estimate?: number;
  _id: number;
  _on: boolean;
}

interface Props {
  cats: Category[];
  onAdd: (o: { text: string; pri: Priority; cat: string | null; due: string; est: number }) => void;
  onClose: () => void;
}

export function AddWithAI({ cats, onAdd, onClose }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<ExtractedItem[] | null>(null);
  const [err, setErr] = useState("");

  const run = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    setErr("");
    setItems(null);
    try {
      const catList = cats.map((c) => c.name).join(", ");
      const prompt = `Today is ${todayIso()}. Extract a list of actionable to-do tasks from the text below (notes, a brain-dump, an email, or a meeting transcript). For each task return a JSON object with: "title" (short, imperative), "priority" ("high"|"med"|"low"), "category" (one of: ${catList}; or "" if unclear), "due" (YYYY-MM-DD if a date/deadline is mentioned or implied, else ""), "estimate" (hours as a number, 0 if unknown). Reply with ONLY a JSON array, no prose.\n\nTEXT:\n${v}`;
      const arr = await aiJSON<Array<Omit<ExtractedItem, "_id" | "_on">>>(prompt, 900, "add-with-ai");
      if (Array.isArray(arr) && arr.length) {
        setItems(arr.map((o, i) => ({ ...o, _id: i, _on: true })));
      } else setErr("Couldn't find tasks in that text. Try rephrasing.");
    } catch {
      setErr("AI isn't available right now. Check your provider in Settings.");
    }
    setBusy(false);
  };

  const addSelected = () => {
    (items || [])
      .filter((x) => x._on)
      .forEach((o) =>
        onAdd({
          text: (o.title || "").trim() || "Untitled",
          pri: (["high", "med", "low"].includes(o.priority || "") ? o.priority : "med") as Priority,
          cat: cats.find((c) => c.name === o.category) ? o.category! : null,
          due: /^\d{4}-\d{2}-\d{2}$/.test(o.due || "") ? o.due! : "",
          est: Number(o.estimate) > 0 ? Number(o.estimate) : 0,
        }),
      );
    onClose();
  };

  const priColor = (p?: string) => (p === "high" ? "#f0506e" : p === "low" ? "#38c172" : "#f5a623");
  const selCount = (items || []).filter((x) => x._on).length;

  return (
    <Overlay onClose={onClose}>
      <div className="awa glass" onClick={(e) => e.stopPropagation()}>
        <div className="awa-in">
          <div className="cm-title">
            <IconSpark /> Add with AI
            <button className="d-close" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="cm-hint">
            Paste a brain-dump, an email, or meeting notes — AI pulls out the tasks (with priority, category, due date & estimate) for you to review.
          </div>

          {!items && (
            <>
              <textarea
                className="awa-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"e.g. Need to send the Q3 deck to Maya by Friday, fix the login bug (urgent), and book a dentist appointment sometime next week…"}
                autoFocus
              />
              {err && <div className="awa-err">{err}</div>}
              <div className="awa-foot">
                <span className="awa-src">via {aiSource()}</span>
                <button className="bf-btn primary" onClick={run} disabled={busy || !text.trim()}>
                  {busy ? "Reading…" : <><IconSpark />Extract tasks</>}
                </button>
              </div>
            </>
          )}

          {items && (
            <>
              <div className="awa-list">
                {items.map((o) => (
                  <label className={"awa-item" + (o._on ? " on" : "")} key={o._id}>
                    <input type="checkbox" checked={o._on} onChange={(e) => setItems(items.map((x) => (x._id === o._id ? { ...x, _on: e.target.checked } : x)))} />
                    <span className="awa-pri" style={{ background: priColor(o.priority) }}></span>
                    <span className="awa-t">{o.title}</span>
                    <span className="awa-meta">
                      {o.due && /^\d{4}-\d{2}-\d{2}$/.test(o.due) && <span className="awa-tag">{fmtDue(o.due)?.label || o.due}</span>}
                      {Number(o.estimate) > 0 && <span className="awa-tag">~{fmtEst(Number(o.estimate))}</span>}
                      {o.category && <span className="awa-tag">{o.category}</span>}
                    </span>
                  </label>
                ))}
              </div>
              <div className="awa-foot">
                <button className="bf-btn" onClick={() => setItems(null)}>← Back</button>
                <button className="bf-btn primary" onClick={addSelected} disabled={!selCount}>
                  <IconPlus />Add {selCount} task{selCount === 1 ? "" : "s"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}
