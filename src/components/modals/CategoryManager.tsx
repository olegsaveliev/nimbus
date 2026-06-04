import { useState } from "react";
import type { Category } from "@/types";
import { CAT_PALETTE } from "@/domain/board";
import { IconPlus, IconTag, IconTrash } from "@/components/icons/Icons";
import { Overlay } from "@/components/common/Overlay";
import { LiveInput } from "@/components/common/LiveField";

interface Props {
  cats: Category[];
  counts: Record<string, number>;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onRecolor: (id: string, color: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export function CategoryManager({ cats, counts, onClose, onRename, onRecolor, onAdd, onDelete }: Props) {
  const [palFor, setPalFor] = useState<string | null>(null);
  return (
    <Overlay onClose={onClose}>
      <div className="cat-mgr glass" onClick={(e) => e.stopPropagation()}>
        <div className="cm-inner">
          <div className="cm-title">
            <IconTag /> Categories
            <button className="d-close" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="cm-hint">Rename a list, tap its dot to recolor, or remove it. Tasks in a deleted list move to the first one.</div>
          <div className="cm-list">
            {cats.map((c) => (
              <div className="cm-row" key={c.id}>
                <div className="cm-dot" style={{ background: c.color }} onClick={() => setPalFor(palFor === c.id ? null : c.id)} title="Change color">
                  {palFor === c.id && (
                    <div className="cm-pop" style={{ top: 32, left: 0 }} onClick={(e) => e.stopPropagation()}>
                      {CAT_PALETTE.map((col) => (
                        <button key={col} className={col === c.color ? "on" : ""} style={{ background: col }} onClick={() => { onRecolor(c.id, col); setPalFor(null); }} aria-label={col} />
                      ))}
                    </div>
                  )}
                </div>
                <LiveInput value={c.name} onChange={(v) => onRename(c.id, v)} placeholder="List name" maxLength={20} />
                <span className="cm-count">{counts[c.name] || 0} open</span>
                <button className="cm-del" onClick={() => onDelete(c.id)} disabled={cats.length <= 1} aria-label="Delete list"><IconTrash /></button>
              </div>
            ))}
          </div>
          <button className="cm-add" onClick={onAdd}><IconPlus /> Add a category</button>
        </div>
      </div>
    </Overlay>
  );
}
