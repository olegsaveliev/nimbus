/* "Add a wish" bottom sheet (mobile): a smart-capture field with example chips
 * and a live parse preview, plus a "+ Add full details" toggle that reveals the
 * complete form. Quick path hands the raw line to useWishes.add (which runs
 * smartParse); the full form hands a draft to addFull — mirroring the desktop
 * capture bar + WishAddModal split. */
import { useEffect, useMemo, useRef, useState } from "react";
import { emptyDraft, fmt$, PRI, smartParse, TYPES } from "@/domain/wishlist";
import type { Wish } from "@/types";
import type { AddDraft } from "@/components/wishlist/WishAddModal";
import { IconArrowR, IconHeart, IconLink, IconPin, IconSpark, IconX } from "@/components/icons/Icons";
import { TYPE_ICON } from "@/components/wishlist/wishIcons";

interface Props {
  onClose: () => void;
  /** Commit the raw capture line (smart-parsed by the data layer). */
  onQuick: (line: string) => void;
  /** Commit the full-details draft. */
  onFull: (draft: AddDraft) => void;
}

const TRY = ["Two weeks in Japan $3500", "Learn to surf someday", "Standing desk $620 want"];

export function WishAddSheet({ onClose, onQuick, onFull }: Props) {
  const [line, setLine] = useState("");
  const [focus, setFocus] = useState(false);
  const [more, setMore] = useState(false);
  const [d, setD] = useState(emptyDraft());
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => smartParse(line), [line]);
  const isUrl = /https?:\/\//i.test(line);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const commit = () => {
    if (more) {
      if (!d.title.trim()) return;
      onFull(d);
      return;
    }
    if (!line.trim()) return;
    onQuick(line);
  };
  const canCommit = more ? !!d.title.trim() : !!line.trim();

  return (
    <div className="wm-scrim" onClick={onClose}>
      <div className="wm-add" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add a wish">
        <div className="wm-add-grab" />
        <div className="wm-add-head">
          <span className="wm-add-ttl">
            <IconHeart s={16} /> Add a wish
          </span>
          <button className="wm-add-x" onClick={onClose} aria-label="Close">
            <IconX s={16} />
          </button>
        </div>
        <div className="wm-add-body">
          <div className={"wm-cap" + (focus ? " focus" : "")}>
            <span className="wm-cap-ic">{isUrl ? <IconLink s={19} /> : <IconSpark />}</span>
            <input
              ref={inputRef}
              autoFocus
              value={line}
              onChange={(e) => setLine(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              onKeyDown={(e) => e.key === "Enter" && !more && commit()}
              placeholder="“AirPods Pro $249 must have”, a goal, or a link"
              aria-label="Capture a wish"
            />
          </div>

          {!line.trim() && !more && (
            <div className="wm-eg">
              {TRY.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setLine(s);
                    inputRef.current?.focus();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {line.trim() && !more && (
            <div className="wm-parse">
              <span className="wm-parse-lead">{isUrl ? "From link" : "Filed as"}</span>
              <span className="wm-pt">
                {typeIcon(parsed.type)} {TYPES[parsed.type].label}
              </span>
              {parsed.price != null && <span className="wm-pt price">{fmt$(parsed.price)}</span>}
              <span className="wm-pt" style={{ color: PRI[parsed.pri].ink }}>
                <i style={{ background: PRI[parsed.pri].c }} />
                {PRI[parsed.pri].label}
              </span>
              {parsed.where && (
                <span className="wm-pt">
                  <IconPin s={11} />
                  {parsed.where}
                </span>
              )}
              <span className="wm-parse-arrow">→ {parsed.title}</span>
            </div>
          )}

          <button className="wm-more-toggle" onClick={() => setMore((m) => !m)}>
            {more ? "− Quick capture" : "+ Add full details"}
          </button>

          {more && (
            <>
              <label className="wm-f">
                <span>What do you want?</span>
                <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Title" />
              </label>
              <label className="wm-f">
                <span>Type</span>
                <div className="wm-seg2">
                  {(Object.entries(TYPES) as Array<[Wish["type"], (typeof TYPES)[Wish["type"]]]>).map(([k, vv]) => {
                    const Ic = TYPE_ICON[vv.ic];
                    return (
                      <button key={k} className={d.type === k ? "on" : ""} onClick={() => setD({ ...d, type: k })}>
                        <Ic s={15} /> {vv.label}
                      </button>
                    );
                  })}
                </div>
              </label>
              <div className="wm-fgrid">
                <label className="wm-f">
                  <span>Price</span>
                  <input value={d.price} onChange={(e) => setD({ ...d, price: e.target.value.replace(/[^\d.]/g, "") })} placeholder="$0" inputMode="decimal" />
                </label>
                <label className="wm-f">
                  <span>Saved</span>
                  <input value={d.saved} onChange={(e) => setD({ ...d, saved: e.target.value.replace(/[^\d.]/g, "") })} placeholder="$0" inputMode="decimal" />
                </label>
                <label className="wm-f">
                  <span>Where</span>
                  <input value={d.where} onChange={(e) => setD({ ...d, where: e.target.value })} placeholder="Store" />
                </label>
                <label className="wm-f">
                  <span>Target</span>
                  <input value={d.target} onChange={(e) => setD({ ...d, target: e.target.value })} placeholder="Oct 2026" />
                </label>
              </div>
              <label className="wm-f">
                <span>Want it</span>
                <div className="wm-seg2">
                  {(Object.entries(PRI) as Array<[Wish["pri"], (typeof PRI)[Wish["pri"]]]>).map(([k, vv]) => (
                    <button key={k} className={d.pri === k ? "on" : ""} onClick={() => setD({ ...d, pri: k })}>
                      <i style={{ background: vv.c }} />
                      {vv.label}
                    </button>
                  ))}
                </div>
              </label>
            </>
          )}

          <button className="wm-commit" disabled={!canCommit} onClick={commit}>
            Add wish <IconArrowR s={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function typeIcon(type: Wish["type"]) {
  const Ic = TYPE_ICON[TYPES[type].ic];
  return <Ic s={12} />;
}
