import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { Column, Task } from "@/types";
import { IconArrowR, IconPlus, IconSearchCmd, IconSpark } from "@/components/icons/Icons";

export interface Command {
  label: ReactNode;
  icon: ReactNode;
  kw?: string;
  sub?: string;
  run: () => void;
}

interface Row {
  type: "add" | "ai" | "cmd" | "task";
  icon: ReactNode;
  label: ReactNode;
  sub?: string;
  run: () => void;
}

interface Props {
  commands: Command[];
  tasks: Task[];
  columns: Column[];
  onQuickAdd: (text: string) => void;
  onAICommand: (text: string) => void;
  onOpenTask: (id: string) => void;
  onClose: () => void;
}

export function CommandPalette({ commands, tasks, columns, onQuickAdd, onAICommand, onOpenTask, onClose }: Props) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setSel(0);
  }, [q]);

  const ql = q.trim().toLowerCase();
  const cmds = commands.filter((c) => {
    if (!ql) return true;
    const label = typeof c.label === "string" ? c.label.toLowerCase() : "";
    return label.includes(ql) || (c.kw || "").includes(ql);
  });
  const taskHits = ql ? tasks.filter((t) => t.text.toLowerCase().includes(ql)).slice(0, 6) : [];

  const rows: Row[] = [];
  if (q.trim()) {
    rows.push({ type: "add", icon: <IconPlus />, label: (<span>Add task <b>“{q.trim()}”</b></span>), run: () => { onQuickAdd(q.trim()); onClose(); } });
    rows.push({ type: "ai", icon: <IconSpark />, label: <span>Ask AI to do this</span>, sub: "AI", run: () => { onAICommand(q.trim()); onClose(); } });
  }
  cmds.forEach((c) => rows.push({ type: "cmd", icon: c.icon, label: c.label, sub: c.sub, run: () => { c.run(); onClose(); } }));
  taskHits.forEach((t) =>
    rows.push({ type: "task", icon: <IconArrowR />, label: t.text, sub: columns.find((c) => c.key === t.status)?.name, run: () => { onOpenTask(t.id); onClose(); } }),
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      rows[sel]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const firstCmd = rows.findIndex((r) => r.type === "cmd");
  const firstTask = rows.findIndex((r) => r.type === "task");

  return (
    <div className="overlay cmdk-overlay" onClick={onClose}>
      <div className="cmdk glass" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-in">
          <IconSearchCmd />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search tasks, add one, or run a command…" />
          <span className="esc">esc</span>
        </div>
        <div className="cmdk-list">
          {rows.length === 0 && <div className="cmdk-empty">No matches.</div>}
          {rows.map((r, i) => (
            <Fragment key={i}>
              {i === firstCmd && firstCmd !== 0 && <div className="cmdk-sec">Actions</div>}
              {i === firstTask && <div className="cmdk-sec">Tasks</div>}
              <div className={"cmdk-row" + (i === sel ? " sel" : "")} onMouseEnter={() => setSel(i)} onClick={() => r.run()}>
                <span className="cr-ic">{r.icon}</span>
                <span className="cr-t">{r.label}</span>
                {r.sub && <span className="cr-s">{r.sub}</span>}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
