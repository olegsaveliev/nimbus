import { useEffect, useRef, useState } from "react";
import type { Board } from "@/types";
import { IconChevDown, IconPencil, IconPlus, IconTrash } from "@/components/icons/Icons";

interface Props {
  boards: Board[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function BoardSwitcher({ boards, activeId, onSwitch, onAdd, onRename, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setRenaming(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const active = boards.find((b) => b.id === activeId) || boards[0];
  return (
    <div className="bsw" ref={ref}>
      <button className="bsw-trigger" onClick={() => setOpen((o) => !o)}>
        <h1>{active ? active.name : "Board"}</h1>
        <IconChevDown s={18} />
      </button>
      {open && (
        <div className="bsw-menu glass">
          <div className="bsw-lbl">Boards</div>
          {boards.map((b) => (
            <div key={b.id} className={"bsw-row" + (b.id === activeId ? " on" : "")}>
              {renaming === b.id ? (
                <input
                  autoFocus
                  className="bsw-rn"
                  defaultValue={b.name}
                  maxLength={28}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) onRename(b.id, v);
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                />
              ) : (
                <button className="bsw-name" onClick={() => { onSwitch(b.id); setOpen(false); }}>
                  <span className="bsw-dot" style={{ opacity: b.id === activeId ? 1 : 0.25 }}></span>
                  {b.name}
                </button>
              )}
              <button className="bsw-ic" onClick={(e) => { e.stopPropagation(); setRenaming(b.id); }} title="Rename" aria-label="Rename">
                <IconPencil s={12} />
              </button>
              <button
                className="bsw-ic del"
                onClick={(e) => {
                  e.stopPropagation();
                  const msg =
                    boards.length <= 1
                      ? `Delete "${b.name}" and all its tasks? A fresh empty board will replace it.`
                      : `Delete board "${b.name}" and all its tasks?`;
                  if (confirm(msg)) {
                    onDelete(b.id);
                    setOpen(false);
                  }
                }}
                title="Delete board"
                aria-label="Delete board"
              >
                <IconTrash />
              </button>
            </div>
          ))}
          <button className="bsw-add" onClick={() => { onAdd(); setOpen(false); }}>
            <IconPlus />
            New board
          </button>
        </div>
      )}
    </div>
  );
}
