import { useState } from "react";
import type { Tweaks } from "@/types";
import { aiSource, clearAKey, clearOKey, getAKey, getOKey, getProvider, setAKey, setOKey, setProvider } from "@/services/ai";
import { IconDownload, IconFlow, IconGear, IconKey, IconSpark } from "@/components/icons/Icons";
import { Overlay } from "@/components/common/Overlay";

interface Props {
  wipLimit: number;
  setWipLimit: (n: number) => void;
  onExport: () => void;
  tweaks: Tweaks;
  setTweak: (key: keyof Tweaks, value: number | string) => void;
  onSignOut: () => void;
  userEmail?: string | null;
  onClose: () => void;
}

const ACCENTS = ["#7c5cff", "#ff6b9d", "#22d3ee", "#34d399", "#fb923c", "#c026d3", "#14b8a6"];

export function Settings({ wipLimit, setWipLimit, onExport, tweaks, setTweak, onSignOut, userEmail, onClose }: Props) {
  const [exported, setExported] = useState(false);
  const [aIn, setAIn] = useState("");
  const [oIn, setOIn] = useState("");
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);
  const prov = getProvider();
  const saveA = () => { const v = aIn.trim(); if (!v) return; setAKey(v); setAIn(""); bump(); };
  const saveO = () => { const v = oIn.trim(); if (!v) return; setOKey(v); setOIn(""); bump(); };

  return (
    <Overlay onClose={onClose}>
      <div className="cat-mgr glass" onClick={(e) => e.stopPropagation()}>
        <div className="cm-inner">
          <div className="cm-title">
            <IconGear s={17} /> Settings
            <button className="d-close" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="cm-hint">App preferences. They sync to your account.</div>

          <div className="keybox" style={{ marginTop: 4 }}>
            <div className="kb-title"><IconKey s={14} /> AI provider (bring your own key)</div>
            <p className="kb-note">
              AI features — the <b style={{ color: "var(--ink)" }}>Brief</b>, <b style={{ color: "var(--ink)" }}>Add with AI</b>, and card assists — use your own API key. Keys are stored only in this browser and sent only to that provider. <b style={{ color: "var(--ink)" }}>Auto</b> uses whichever key you've added.
            </p>
            <div className="rep-row">
              {[["auto", "Auto"], ["anthropic", "Anthropic"], ["openai", "OpenAI"]].map(([v, l]) => (
                <button key={v} className={"rep-btn" + (prov === v ? " on" : "")} onClick={() => { setProvider(v); bump(); }}>{l}</button>
              ))}
            </div>
            <div className="set-row">
              <div className="sl-head"><span>Anthropic key {getAKey() && <span style={{ color: "#1f8f54" }}>✓</span>}</span><span></span></div>
              <div className="kb-row">
                <input type="password" placeholder="sk-ant-…" value={aIn} onChange={(e) => setAIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveA(); }} />
                <button className="bf-btn primary" onClick={saveA}>Save</button>
                {getAKey() && <button className="bf-btn" onClick={() => { clearAKey(); bump(); }}>Remove</button>}
              </div>
            </div>
            <div className="set-row">
              <div className="sl-head"><span>OpenAI key {getOKey() && <span style={{ color: "#1f8f54" }}>✓</span>}</span><span></span></div>
              <div className="kb-row">
                <input type="password" placeholder="sk-…" value={oIn} onChange={(e) => setOIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveO(); }} />
                <button className="bf-btn primary" onClick={saveO}>Save</button>
                {getOKey() && <button className="bf-btn" onClick={() => { clearOKey(); bump(); }}>Remove</button>}
              </div>
            </div>
            <div className="kb-src">Generating with: <b>{aiSource()}</b></div>
          </div>

          <div className="keybox" style={{ marginTop: 10 }}>
            <div className="kb-title"><IconSpark /> Appearance</div>
            <p className="kb-note">Tune the frosted-glass look to your taste. Saved automatically.</p>
            <div className="set-row">
              <div className="sl-head"><span>Blur</span><span>{tweaks.blur}px</span></div>
              <input type="range" min={0} max={40} value={tweaks.blur} onChange={(e) => setTweak("blur", +e.target.value)} />
            </div>
            <div className="set-row">
              <div className="sl-head"><span>Frost opacity</span><span>{(+tweaks.opacity).toFixed(2)}</span></div>
              <input type="range" min={0.15} max={0.8} step={0.01} value={tweaks.opacity} onChange={(e) => setTweak("opacity", +e.target.value)} />
            </div>
            <div className="set-row">
              <div className="sl-head"><span>Roundness</span><span>{tweaks.radius}px</span></div>
              <input type="range" min={6} max={32} value={tweaks.radius} onChange={(e) => setTweak("radius", +e.target.value)} />
            </div>
            <div className="set-row">
              <div className="sl-head"><span>Accent</span><span></span></div>
              <div className="set-acc">
                {ACCENTS.map((c) => (
                  <button key={c} className={tweaks.accent === c ? "on" : ""} style={{ background: c }} onClick={() => setTweak("accent", c)} aria-label={c}></button>
                ))}
              </div>
            </div>
          </div>

          <div className="keybox" style={{ marginTop: 10 }}>
            <div className="kb-title"><IconFlow s={14} /> Board · WIP limit</div>
            <p className="kb-note">A soft cap on <b style={{ color: "var(--ink)" }}>In Progress</b> — the column warns when you go over, to keep you focused.</p>
            <div className="rep-row">
              {[2, 3, 4, 5, 6].map((n) => (
                <button key={n} className={"rep-btn" + (wipLimit === n ? " on" : "")} onClick={() => setWipLimit(n)}>{n}</button>
              ))}
            </div>
          </div>

          <div className="keybox" style={{ marginTop: 10 }}>
            <div className="kb-title"><IconDownload s={14} /> Export</div>
            <p className="kb-note">Copy the whole board as Markdown (great for notes, docs, or sharing).</p>
            <button className="bf-btn primary" style={{ alignSelf: "flex-start" }} onClick={() => { onExport(); setExported(true); setTimeout(() => setExported(false), 1600); }}>
              <IconDownload s={14} />{exported ? "Copied to clipboard!" : "Copy board as Markdown"}
            </button>
          </div>

          <div className="keybox" style={{ marginTop: 10 }}>
            <div className="kb-title"><IconKey s={14} /> Account</div>
            <p className="kb-note">
              {userEmail ? (<>Signed in as <b style={{ color: "var(--ink)" }}>{userEmail}</b>.</>) : "You're signed in."} Boards sync to your account.
            </p>
            <button className="bf-btn" style={{ alignSelf: "flex-start" }} onClick={() => { onClose(); onSignOut(); }}>Sign out</button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
