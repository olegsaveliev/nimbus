import { useEffect, useState } from "react";
import type { Task } from "@/types";
import { fmtDue, todayIso } from "@/domain/dates";
import { depsBlockedCount } from "@/domain/deps";
import { fmtEst } from "@/domain/estimate";
import { useUI } from "@/state/uiStore";
import { aiComplete } from "@/services/ai";
import { IconPause, IconPlay, IconRepeat, IconSpark, IconTarget } from "@/components/icons/Icons";
import { Overlay } from "@/components/common/Overlay";

interface Props {
  tasks: Task[];
  onClose: () => void;
  onComplete: (id: string) => void;
  onOpen: (id: string) => void;
}

export function Focus({ tasks, onClose, onComplete, onOpen }: Props) {
  const secs = useUI((s) => s.pomoSecs);
  const running = useUI((s) => s.pomoRun);
  const mode = useUI((s) => s.pomoMode);
  const sessions = useUI((s) => s.pomoSessions);
  const curId = useUI((s) => s.pomoTask);
  const setCurId = useUI((s) => s.setPomoTask);
  const onToggle = useUI((s) => s.togglePomo);
  const onReset = useUI((s) => s.resetPomo);

  const ti = todayIso();
  const open = tasks.filter((t) => t.status !== "done");
  let list = open.filter((t) => t.status === "doing" || (t.due && t.due <= ti));
  if (!list.length) list = tasks.filter((t) => t.status === "todo" && depsBlockedCount(t, tasks) === 0).slice(0, 6);

  useEffect(() => {
    if (!list.find((x) => x.id === curId)) setCurId(list[0] ? list[0].id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const cur = list.find((x) => x.id === curId);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const CAP = 6;
  const totalEst = list.reduce((s, t) => s + (Number(t.est) || 0), 0);
  const overCap = totalEst > CAP;

  const [steps, setSteps] = useState<Record<string, string>>({});
  const [stepBusy, setStepBusy] = useState(false);
  const firstStep = async () => {
    if (!cur || stepBusy) return;
    setStepBusy(true);
    try {
      const out = await aiComplete(
        `What is the very first concrete 5-minute action to start this task? Reply with ONE short imperative sentence, no preamble. Task: "${cur.text}".${cur.desc ? " Context: " + cur.desc : ""}`,
        80,
        "first-step",
      );
      if (out && out.trim()) setSteps((p) => ({ ...p, [cur.id]: out.trim().replace(/^[\-•\d.\s]+/, "") }));
    } catch {
      setSteps((p) => ({ ...p, [cur.id]: "AI isn't available — check Settings." }));
    }
    setStepBusy(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="focus glass" onClick={(e) => e.stopPropagation()}>
        <div className="focus-scroll">
          <div className="focus-head">
            <div className="ttl"><IconTarget s={19} />Focus</div>
            <button className="d-close" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="Close">×</button>
          </div>

          <div className="timer">
            <span className={"mode " + mode}>{mode === "work" ? "Focus" : "Break"}</span>
            <div className="clock">{mm}:{ss}</div>
            <div className="timer-ctrl">
              <button className="primary" onClick={onToggle}>{running ? <><IconPause />Pause</> : <><IconPlay />Start</>}</button>
              <button onClick={onReset}><IconRepeat s={14} />Reset</button>
            </div>
            <span className="sessions">{sessions} focus session{sessions === 1 ? "" : "s"} done today</span>
          </div>

          <div className="focus-now">{cur ? <>Focusing on <b>{cur.text}</b></> : "Pick a task below to focus on"}</div>
          {cur && (
            <div className="focus-step">
              {steps[cur.id] ? (
                <div className="fstep-out"><IconSpark /><span>{steps[cur.id]}</span></div>
              ) : (
                <button className="fstep-btn" onClick={firstStep} disabled={stepBusy}><IconSpark />{stepBusy ? "Thinking…" : "What's the first step?"}</button>
              )}
            </div>
          )}

          <div className="focus-label">
            Today's focus{totalEst > 0 && <span className={"cap-tag" + (overCap ? " over" : "")}>{fmtEst(totalEst)} planned · {CAP}h day</span>}
          </div>
          {totalEst > 0 && (
            <div className="cap-bar" title={fmtEst(totalEst) + " of a " + CAP + "h day"}>
              <span style={{ width: Math.min(100, (totalEst / CAP) * 100) + "%" }} className={overCap ? "over" : ""}></span>
            </div>
          )}
          {overCap && <div className="cap-note">That's more than a focused day fits — consider moving a couple of these to tomorrow.</div>}
          <div className="focus-list">
            {list.length === 0 ? (
              <div className="focus-empty">Nothing pressing — enjoy the calm. 🌤️</div>
            ) : (
              list.map((t) => (
                <div className={"focus-item" + (curId === t.id ? " cur" : "")} key={t.id} onClick={() => setCurId(t.id)}>
                  <button className="fcheck" onClick={(e) => { e.stopPropagation(); onComplete(t.id); }} aria-label="Complete"></button>
                  <span className="ft">{t.text}</span>
                  {curId === t.id && <span className="fcur-tag">focusing</span>}
                  <span className="fmeta" onClick={(e) => { e.stopPropagation(); onOpen(t.id); }}>{t.due ? fmtDue(t.due)?.label || "" : t.cat}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Overlay>
  );
}
