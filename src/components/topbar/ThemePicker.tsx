import { useEffect, useRef, useState } from "react";
import { DEFAULT_THEME, THEMES, grad } from "@/domain/themes";
import { IconChevron, IconTick } from "@/components/icons/Icons";

export function ThemePicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  const safeValue = THEMES[value] ? value : DEFAULT_THEME;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="theme-pick" ref={ref}>
      <button className={"theme-btn" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)}>
        <span className="sw" style={{ background: grad(THEMES[safeValue].bg) }}></span>
        {THEMES[safeValue].name}
        <span className="chev">
          <IconChevron />
        </span>
      </button>
      {open && (
        <div className="theme-menu glass">
          <div className="tm-title">Theme</div>
          {THEMES.map((th, i) => (
            <button
              key={th.name}
              className={"tm-opt" + (i === safeValue ? " on" : "")}
              onClick={() => {
                onChange(i);
                setOpen(false);
              }}
            >
              <span className="tm-prev" style={{ background: grad(th.bg) }}></span>
              <span className="tm-name">{th.name}</span>
              <span className="tm-check">
                <IconTick s={17} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
