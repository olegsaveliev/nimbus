import type { Task } from "@/types";
import { fmtDue } from "@/domain/dates";
import { depsBlockedCount } from "@/domain/deps";
import { fmtEst } from "@/domain/estimate";
import { REPEAT_LABEL } from "@/domain/recurrence";
import { useUI } from "@/state/uiStore";
import { IconCal, IconChat, IconChatFill, IconCheckSq, IconClock, IconLink, IconNote, IconRepeat, IconTrash } from "@/components/icons/Icons";

interface CardProps {
  t: Task;
  allTasks: Task[];
  dragging: boolean;
  flash: boolean;
  /** This card is on the board's talking-points list. */
  pinned?: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDelete: (id: string) => void;
  onCyclePri: (id: string) => void;
  onOpen: (id: string) => void;
  /** Toggle this card on/off the talking-points list. */
  onPin?: (task: { id: string; text: string }) => void;
  onItemDragOver?: (after: boolean) => void;
}

export function Card({ t, allTasks, dragging, flash, pinned, onDragStart, onDragEnd, onDelete, onCyclePri, onOpen, onPin, onItemDragOver }: CardProps) {
  const compact = useUI((s) => s.compact);
  const due = fmtDue(t.due);
  const done = t.status === "done";
  const blockedN = depsBlockedCount(t, allTasks || []);
  const subs = t.subtasks || [];
  const subDone = subs.filter((s) => s.done).length;
  const rep = t.repeat && t.repeat !== "none" ? t.repeat : null;
  const est = t.est ? fmtEst(t.est) : null;
  const hasFooter = t.desc || (t.comments && t.comments.length > 0) || blockedN > 0 || subs.length > 0 || rep || est;

  return (
    <div
      className={"kcard" + (compact ? " compact pc-" + t.pri : "") + (done ? " done" : "") + (dragging ? " dragging" : "") + (flash ? " just-ready" : "")}
      draggable
      onDragStart={(e) => onDragStart(e, t.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        onItemDragOver && onItemDragOver(e.clientY - r.top > r.height / 2);
      }}
      onClick={() => onOpen(t.id)}
    >
      <div className="kc-top">
        <div className="txt">{t.text}</div>
        {onPin && (
          <button
            className={"kc-pin" + (pinned ? " on" : "")}
            onClick={(e) => { e.stopPropagation(); onPin({ id: t.id, text: t.text }); }}
            title={pinned ? "Remove from talking points" : "Add to talking points"}
            aria-label={pinned ? "Remove from talking points" : "Add to talking points"}
          >
            {pinned ? <IconChatFill s={14} /> : <IconChat s={14} />}
          </button>
        )}
        <button className="del" onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} aria-label="Delete">
          <IconTrash />
        </button>
      </div>
      {!compact && (
      <div className="kc-meta">
        <span className={"pri-tag " + t.pri} onClick={(e) => { e.stopPropagation(); onCyclePri(t.id); }} title="Click to change priority">
          <i></i>
          {t.pri === "med" ? "med" : t.pri}
        </span>
        {due && (
          <span className={"due" + (due.over && !done ? " over" : "")}>
            <IconCal />
            {due.label}
          </span>
        )}
        {hasFooter && (
          <span className="kc-badges">
            {blockedN > 0 && (
              <span className="kc-badge blocked">
                <IconLink />
                Blocked
              </span>
            )}
            {rep && (
              <span className="kc-badge">
                <IconRepeat />
                {REPEAT_LABEL[rep]}
              </span>
            )}
            {subs.length > 0 && (
              <span className="kc-badge">
                <IconCheckSq />
                {subDone}/{subs.length}
              </span>
            )}
            {est && (
              <span className="kc-badge est-tag">
                <IconClock s={11} />
                {est}
              </span>
            )}
            {t.desc && (
              <span className="kc-badge">
                <IconNote />
              </span>
            )}
            {t.comments && t.comments.length > 0 && (
              <span className="kc-badge">
                <IconChat />
                {t.comments.length}
              </span>
            )}
          </span>
        )}
        <span className="cat-tag">{t.cat}</span>
      </div>
      )}
    </div>
  );
}
