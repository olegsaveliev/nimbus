/* Per-column quick-add footer with natural-language parsing & preview. */
import { useEffect, useRef, useState } from "react";
import type { Category, Priority } from "@/types";
import { fmtDue } from "@/domain/dates";
import { parseQuickAdd } from "@/domain/quickAdd";
import { IconCal, IconPlus } from "@/components/icons/Icons";

interface Props {
  colKey: string;
  cats: Category[];
  onAdd: (status: string, text: string, pri: Priority | null, cat: string | null, due: string | null) => void;
}

export function QuickAdd({ colKey, cats, onAdd }: Props) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [pri, setPri] = useState<Priority>("med");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (adding && ref.current) ref.current.focus();
  }, [adding]);

  const submit = () => {
    const p = parseQuickAdd(text, cats);
    const title = p.text || text.trim();
    if (!title) {
      setAdding(false);
      return;
    }
    onAdd(colKey, title, p.pri || pri, p.cat, p.due);
    setText("");
    setPri("med");
    if (ref.current) ref.current.focus();
  };

  const pv = parseQuickAdd(text, cats);
  const showPv = text.trim() && (pv.pri || pv.cat || pv.due);

  return (
    <div className="col-add">
      {!adding ? (
        <button className="add-trigger" onClick={() => setAdding(true)}>
          <IconPlus /> Add a task
        </button>
      ) : (
        <div className="add-form">
          <textarea
            ref={ref}
            rows={2}
            value={text}
            placeholder={"What needs doing?  —  try “tomorrow #Work !high”"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setText("");
              }
            }}
          />
          {showPv ? (
            <div className="qa-pv">
              {pv.pri && (
                <span className={"qa-tag " + pv.pri}>
                  <i></i>
                  {pv.pri === "med" ? "medium" : pv.pri}
                </span>
              )}
              {pv.due && (
                <span className="qa-tag">
                  <IconCal />
                  {fmtDue(pv.due)?.label}
                </span>
              )}
              {pv.cat && <span className="qa-tag">{pv.cat}</span>}
            </div>
          ) : (
            <div className="qa-hint">
              Type naturally — add <b>tomorrow</b>, <b>#List</b>, or <b>!high</b> and I'll set the date, category &amp; priority.
            </div>
          )}
          <div className="add-actions">
            {(["high", "med", "low"] as Priority[]).map((p) => (
              <button key={p} className={"pribtn " + p + (pri === p ? " sel" : "")} onClick={() => setPri(p)} aria-label={p}>
                <i></i>
              </button>
            ))}
            <span className="grow"></span>
            <button className="add-cancel" onClick={() => { setAdding(false); setText(""); }} aria-label="Cancel">
              ×
            </button>
            <button className="add-save" onClick={submit}>
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
