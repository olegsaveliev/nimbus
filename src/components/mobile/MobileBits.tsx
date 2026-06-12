/* Small shared pieces of the phone UI: the % progress ring, the theme-swatch
 * button + popover, and the Tasks ⇄ Wishlist segmented switch. Class names
 * match the mobile design handoff (wm-ring / tdm-ring / wm-theme / wm-seg). */
import { useState } from "react";
import { THEMES } from "@/domain/themes";
import { IconCheckSq, IconHeart } from "@/components/icons/Icons";

/* ---- progress ring (wishlist 56px "saved", tasks 62px "done") ---- */
interface RingProps {
  pct: number;
  label: string;
  /** "wm" (wishlist sizing) or "tdm" (tasks sizing) — picks the CSS scope. */
  kind: "wm" | "tdm";
  size?: number;
  sw?: number;
}

export function MiniRing({ pct, label, kind, size = kind === "wm" ? 56 : 62, sw = 6 }: RingProps) {
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  return (
    <div className={kind + "-ring"} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="bg" cx={mid} cy={mid} r={r} fill="none" strokeWidth={sw} />
        <circle className="fg" cx={mid} cy={mid} r={r} fill="none" strokeWidth={sw} strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div className={kind + "-ring-lbl"}>
        <b>{pct}%</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

/* ---- theme swatch button + popover (global preferences themes) ---- */
interface ThemeProps {
  theme: number;
  onSelectTheme: (i: number) => void;
}

export function ThemeSwatch({ theme, onSelectTheme }: ThemeProps) {
  const [open, setOpen] = useState(false);
  const cur = THEMES[theme] || THEMES[0];
  const sw = (bg: [string, string, string]) => `linear-gradient(135deg, ${bg[0]}, ${bg[2]})`;
  return (
    <div className="wm-theme">
      <button className="wm-theme-btn" aria-label="Theme" onClick={() => setOpen((o) => !o)} style={{ background: sw(cur.bg) }} />
      {open && (
        <>
          <div className="wm-theme-scrim" onClick={() => setOpen(false)} />
          <div className="wm-theme-pop glass">
            {THEMES.map((t, i) => (
              <button
                key={t.name}
                className={"wm-sw" + (theme === i ? " on" : "")}
                title={t.name}
                aria-label={t.name}
                style={{ background: sw(t.bg) }}
                onClick={() => {
                  onSelectTheme(i);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Tasks ⇄ Wishlist segmented switch ---- */
interface SegProps {
  active: "tasks" | "wishlist";
  onTasks: () => void;
  onWishlist: () => void;
}

export function AppSeg({ active, onTasks, onWishlist }: SegProps) {
  return (
    <div className="wm-seg">
      {active === "tasks" ? (
        <span className="on" title="Tasks">
          <IconCheckSq s={13} />
        </span>
      ) : (
        <button type="button" title="Tasks" aria-label="Go to tasks" onClick={onTasks}>
          <IconCheckSq s={13} />
        </button>
      )}
      {active === "wishlist" ? (
        <span className="on" title="Wishlist">
          <IconHeart s={13} />
        </span>
      ) : (
        <button type="button" title="Wishlist" aria-label="Go to wishlist" onClick={onWishlist}>
          <IconHeart s={13} />
        </button>
      )}
    </div>
  );
}
