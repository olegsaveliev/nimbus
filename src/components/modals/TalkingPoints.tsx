/* Talking Points — a per-board, pinned list of one-line notes to raise with a
 * client (or in any meeting). Build it from cards (the chat-bubble pin) or by
 * hand; check points off as "discussed", edit inline, drag to reorder, copy an
 * email-ready agenda, or promote a manual point into a real board card. */
import { useEffect, useRef, useState } from "react";
import type { Category, TalkingPoint, Task } from "@/types";
import { Overlay } from "@/components/common/Overlay";
import { IconChat, IconCopy, IconGrip, IconLink, IconPlus, IconTicket, IconTick, IconTrash } from "@/components/icons/Icons";

interface Props {
  boardName: string;
  points: TalkingPoint[];
  /** Resolve a point's source card by id (null when the card is gone). */
  tasksById: Map<string, Task>;
  cats: Category[];
  onClose: () => void;
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onClear: () => void;
  onJump: (taskId: string) => void;
  onMakeTask: (id: string) => void;
}

/* ---------- inline-editable text ---------- */
function Editable({ value, done, onCommit }: { value: string; done: boolean; onCommit: (text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) ref.current.textContent = value;
  }, [value]);
  return (
    <div
      className={"tp-text" + (done ? " done" : "")}
      contentEditable
      suppressContentEditableWarning
      ref={ref}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

export function TalkingPoints({
  boardName,
  points,
  tasksById,
  cats,
  onClose,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
  onClear,
  onJump,
  onMakeTask,
}: Props) {
  const [draft, setDraft] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [copied, setCopied] = useState(0);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const open = points.filter((p) => !p.done).length;
  const done = points.length - open;
  const catColor = (name: string | null) => cats.find((c) => c.name === name)?.color ?? "var(--accent)";

  const add = () => {
    const v = draft.replace(/\s+/g, " ").trim();
    if (!v) return;
    onAdd(v);
    setDraft("");
  };

  const drop = (to: number) => {
    const from = dragFrom.current;
    if (from != null && from !== to) onReorder(from, to);
    dragFrom.current = null;
    setDragOver(null);
  };

  const copyAll = () => {
    const lines = [`Talking points — ${boardName}`, ""];
    points.filter((p) => !p.done).forEach((p) => lines.push("• " + p.text));
    const dn = points.filter((p) => p.done);
    if (dn.length) {
      lines.push("", "Discussed:");
      dn.forEach((p) => lines.push("✓ " + p.text));
    }
    const text = lines.join("\n");
    try {
      navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setCopied(points.length);
    setTimeout(() => setCopied(0), 1900);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="tpm glass" onClick={(e) => e.stopPropagation()}>
        <div className="tpm-top">
          <div className="tpm-titles">
            <div className="tpm-eyebrow">Talking points</div>
            <h2><span className="tpm-dot"></span>{boardName}</h2>
          </div>
          <button className="tpm-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="tpm-body">
          {points.length === 0 ? (
            <div className="tp-empty">
              <span className="ico"><IconChat s={22} /></span>
              <b>No talking points yet</b>
              <span>Tap the chat icon on any card to add it here, or type one below.</span>
            </div>
          ) : (
            <div className="tp-entries">
              {points.map((p, i) => {
                const src = p.taskId ? tasksById.get(p.taskId) : null;
                return (
                  <div
                    key={p.id}
                    className={"tp-row" + (p.done ? " done" : "") + (dragOver === i ? " drag-over" : "") + (dragFrom.current === i ? " drag-ghost" : "")}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                    onDrop={(e) => { e.preventDefault(); drop(i); }}
                  >
                    <span
                      className="tp-grip"
                      draggable
                      onDragStart={() => { dragFrom.current = i; setDragOver(i); }}
                      onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
                      title="Drag to reorder"
                    >
                      <IconGrip s={14} />
                    </span>
                    <button
                      className={"tp-check" + (p.done ? " on" : "")}
                      onClick={() => onToggle(p.id)}
                      title={p.done ? "Mark not discussed" : "Mark discussed"}
                      aria-label={p.done ? "Mark not discussed" : "Mark discussed"}
                    >
                      {p.done && <IconTick s={12} />}
                    </button>
                    <div className="tp-main">
                      <Editable value={p.text} done={p.done} onCommit={(txt) => onEdit(p.id, txt)} />
                      {src ? (
                        <span className="tp-src" onClick={() => onJump(src.id)} title="Jump to card">
                          <span className="tp-cdot" style={{ background: catColor(src.cat) }}></span>
                          <IconLink s={11} />
                          {src.text}
                        </span>
                      ) : (
                        <button className="tp-make" onClick={() => onMakeTask(p.id)} title="Create a task on the board from this point">
                          <IconTicket s={12} /> Make a task
                        </button>
                      )}
                    </div>
                    <button className="tp-del" onClick={() => onDelete(p.id)} title="Remove" aria-label="Remove">
                      <IconTrash />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="tp-add" onClick={(e) => e.currentTarget.querySelector("input")?.focus()}>
            <IconPlus />
            <input
              value={draft}
              placeholder="Type a point to discuss…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            />
          </div>
        </div>

        <div className="tpm-foot">
          <button className="tp-btn primary" onClick={copyAll} disabled={!points.length}>
            <IconCopy /> Copy all
          </button>
          <span className="tp-count">{open} open · {done} done</span>
          <span className="tp-spring"></span>
          {points.length > 0 &&
            (confirmClear ? (
              <span className="tp-count tp-clear-confirm">
                Clear all?
                <button className="tp-btn ghost" onClick={() => { onClear(); setConfirmClear(false); }}><span className="yes">Yes</span></button>
                <button className="tp-btn ghost" onClick={() => setConfirmClear(false)}>No</button>
              </span>
            ) : (
              <button className="tp-btn ghost" onClick={() => setConfirmClear(true)}>Clear all</button>
            ))}
        </div>

        {copied > 0 && (
          <div className="tp-toast"><IconTick s={13} /> Copied {copied} {copied === 1 ? "point" : "points"}</div>
        )}
      </div>
    </Overlay>
  );
}
