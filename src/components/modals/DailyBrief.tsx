import { useCallback, useState } from "react";
import type { Task } from "@/types";
import { fmtDue } from "@/domain/dates";
import { type BriefMode, buildBrief, briefPlainText, briefPrompt, fallbackNarrative } from "@/domain/brief";
import { aiComplete, aiSource } from "@/services/ai";
import { IconCopy, IconSpark, IconWand } from "@/components/icons/Icons";
import { Overlay } from "@/components/common/Overlay";

const TABS: Array<[BriefMode, string]> = [
  ["daily", "Daily"],
  ["review", "Review"],
];

export function DailyBrief({ tasks, onClose }: { tasks: Task[]; onClose: () => void }) {
  const [mode, setMode] = useState<BriefMode>("daily");
  const [narr, setNarr] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(
    (m: BriefMode, force: boolean) => {
      setNarr((prev) => {
        if (prev[m] && !force) return prev;
        (async () => {
          setLoading(true);
          let text: string;
          try {
            text = await aiComplete(briefPrompt(tasks, m), 300, "brief-" + m);
            if (!text || !text.trim()) text = fallbackNarrative(tasks, m);
          } catch {
            text = fallbackNarrative(tasks, m);
          }
          setNarr((p) => ({ ...p, [m]: text.trim() }));
          setLoading(false);
        })();
        return prev;
      });
    },
    [tasks],
  );

  const data = buildBrief(tasks, mode);
  const copy = () => {
    const txt = (narr[mode] ? narr[mode] + "\n\n" : "") + briefPlainText(tasks, mode);
    try {
      navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" });

  return (
    <Overlay onClose={onClose}>
      <div className="brief glass" onClick={(e) => e.stopPropagation()}>
        <div className="brief-scroll">
          <div className="brief-head">
            <div className="ttl"><IconWand s={19} />{weekday}'s Brief</div>
            <button className="d-close" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="Close">×</button>
          </div>

          <div className="brief-tabs">
            {TABS.map(([m, label]) => (
              <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{label}</button>
            ))}
          </div>

          <div className={"narrative" + (loading && !narr[mode] ? " loading" : "")}>
            <span className="ai"><IconSpark /></span>
            {loading && !narr[mode] ? (
              <span>Reading your board<span className="dots"><span>.</span><span>.</span><span>.</span></span></span>
            ) : narr[mode] ? (
              <span>{narr[mode]}</span>
            ) : (
              <span className="muted">Click “Generate” for an AI summary of your board.</span>
            )}
          </div>

          {mode === "review" && data.stats && (
            <div className="brief-stats">
              {data.stats.map((s, i) => (
                <div className={"bstat" + (s.warn ? " warn" : "")} key={i}>
                  <div className="bv">{s.v}</div>
                  <div className="bl">{s.l}</div>
                </div>
              ))}
            </div>
          )}

          {data.empty ? (
            <div className="allclear">
              <div className="em">✨</div>
              Nothing overdue or due today. You're clear!
            </div>
          ) : (
            data.groups.map((g) => (
              <div className="bgroup" key={g.key}>
                <div className="gh">
                  <span className="gdot" style={{ background: g.color }}></span>
                  {g.label}
                  <span className="gn">{g.items.length}</span>
                </div>
                {g.items.map((t) => {
                  const d = fmtDue(t.due);
                  return (
                    <div className="bitem" key={t.id}>
                      <span className={"pri " + t.pri}></span>
                      <span className="bt">{t.text}</span>
                      {d && <span className={"bmeta" + (d.over ? " over" : "")}>{d.label}</span>}
                      <span className="bmeta">{t.cat}</span>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          <div className="brief-foot">
            <button className="bf-btn primary" onClick={copy}><IconCopy />{copied ? "Copied!" : "Copy brief"}</button>
            <button className="bf-btn" onClick={() => generate(mode, true)} disabled={loading}><IconSpark />{loading ? "Writing…" : narr[mode] ? "Regenerate" : "Generate"}</button>
            <span className="brief-src" style={{ marginLeft: "auto" }}>via {aiSource()}</span>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
