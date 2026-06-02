import type { Template } from "@/domain/templates";
import { TEMPLATES } from "@/domain/templates";
import { IconCopy } from "@/components/icons/Icons";
import { Overlay } from "@/components/common/Overlay";

interface Props {
  onPick: (tp: Template) => void;
  onClose: () => void;
}

export function TemplatePicker({ onPick, onClose }: Props) {
  return (
    <Overlay onClose={onClose}>
      <div className="tpl glass" onClick={(e) => e.stopPropagation()}>
        <div className="tpl-in">
          <div className="cm-title">
            <IconCopy /> New from template
            <button className="d-close" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="cm-hint">
            Start a card pre-filled with a structure and checklist. It lands at the top of <b style={{ color: "var(--ink)" }}>To Do</b> — edit it from there.
          </div>
          <div className="tpl-grid">
            {TEMPLATES.map((tp) => (
              <button className="tpl-card" key={tp.id} onClick={() => { onPick(tp); onClose(); }}>
                <span className="tpl-ic">{tp.icon}</span>
                <span className="tpl-name">{tp.name}</span>
                {tp.subs.length > 0 && <span className="tpl-meta">{tp.subs.length} steps</span>}
                <span className={"tpl-pri " + tp.pri}></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Overlay>
  );
}
