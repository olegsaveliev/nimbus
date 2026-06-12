/* Near-full-height detail sheet for a wish (mobile): hero thumbnail + grab
 * handle, editable title, type/priority/where/target grid, the save block
 * (price + bump buttons), note, stage segment, and the link/remove footer.
 * Slides up over a blurred scrim inside the phone shell; closes on scrim tap
 * or Esc. Edits patch the cache immediately — text fields go through local
 * draft state so the caret can't jump (same fix as the desktop WishDrawer). */
import { useEffect, useState } from "react";
import { deriveStage, fmt$, PRI, savedPct, STAGES, TYPES } from "@/domain/wishlist";
import type { Wish } from "@/types";
import { IconLink, IconX } from "@/components/icons/Icons";
import { TYPE_ICON } from "@/components/wishlist/wishIcons";
import { WishThumb } from "@/components/wishlist/WishThumb";
import { WishBar } from "@/components/wishlist/WishBar";

interface Props {
  item: Wish;
  onClose: () => void;
  onPatch: (id: string, d: Partial<Wish>) => void;
  onBump: (id: string, amount: number) => void;
  onDel: (id: string) => void;
}

export function WishDetailSheet({ item, onClose, onPatch, onBump, onDel }: Props) {
  // Local drafts for text fields: cache updates land asynchronously, so binding
  // inputs straight to `item` would restore the last-rendered value and throw
  // the caret to the end on every keystroke.
  const [draft, setDraft] = useState(() => ({
    title: item.title,
    where: item.where === "—" ? "" : item.where,
    target: item.target,
    note: item.note,
    price: item.price != null ? String(item.price) : "",
  }));
  const id = item.id;
  useEffect(() => {
    setDraft({
      title: item.title,
      where: item.where === "—" ? "" : item.where,
      target: item.target,
      note: item.note,
      price: item.price != null ? String(item.price) : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const setText = (key: "title" | "where" | "target" | "note", v: string) => {
    setDraft((p) => ({ ...p, [key]: v }));
    onPatch(item.id, { [key]: v } as Partial<Wish>);
  };
  const setPrice = (raw: string) => {
    const v = raw.replace(/[^\d.]/g, "");
    setDraft((p) => ({ ...p, price: v }));
    const n = parseFloat(v);
    const price = v && !isNaN(n) ? n : null;
    onPatch(item.id, { price, stage: deriveStage(item.saved, price, item.stage) });
  };

  const t = TYPES[item.type];
  const TypeIcon = TYPE_ICON[t.ic];
  const pct = savedPct(item.saved, item.price);

  return (
    <div className="wm-scrim" onClick={onClose}>
      <div className="wm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={item.title || "Wish details"}>
        <div className="wm-sheet-hero">
          <WishThumb id={item.id} title={item.title} type={item.type} r={0} iconSize={40} style={{ height: "100%", width: "100%" }} />
          <div className="wm-sheet-grab" />
          <button className="wm-sheet-close" onClick={onClose} aria-label="Close">
            <IconX s={17} />
          </button>
          <span className="wm-type-pill">
            <TypeIcon s={12} /> {t.label}
          </span>
        </div>

        <div className="wm-sheet-body">
          <input className="wm-sheet-title" value={draft.title} onChange={(e) => setText("title", e.target.value)} placeholder="Name this wish…" aria-label="Title" />

          <div className="wm-fgrid">
            <label className="wm-f">
              <span>Type</span>
              <div className="wm-seg2">
                {(Object.entries(TYPES) as Array<[Wish["type"], (typeof TYPES)[Wish["type"]]]>).map(([k, vv]) => {
                  const Ic = TYPE_ICON[vv.ic];
                  return (
                    <button key={k} className={item.type === k ? "on" : ""} onClick={() => onPatch(item.id, { type: k })} title={vv.label} aria-label={vv.label}>
                      <Ic s={16} />
                    </button>
                  );
                })}
              </div>
            </label>
            <label className="wm-f">
              <span>Want it</span>
              <div className="wm-seg2">
                {(Object.entries(PRI) as Array<[Wish["pri"], (typeof PRI)[Wish["pri"]]]>).map(([k, vv]) => (
                  <button key={k} className={item.pri === k ? "on" : ""} onClick={() => onPatch(item.id, { pri: k })} title={vv.label} aria-label={vv.label}>
                    <i style={{ background: vv.c }} />
                  </button>
                ))}
              </div>
            </label>
            <label className="wm-f">
              <span>Where</span>
              <input value={draft.where} onChange={(e) => setText("where", e.target.value)} placeholder="Store or source" />
            </label>
            <label className="wm-f">
              <span>Target date</span>
              <input value={draft.target} onChange={(e) => setText("target", e.target.value)} placeholder="e.g. Oct 2026" />
            </label>
          </div>

          <div className="wm-save">
            <div className="wm-save-money">
              <b>{fmt$(item.saved)}</b>
              <span>{item.price != null ? "saved of " + fmt$(item.price) + " · " + pct + "%" : "saved"}</span>
            </div>
            {item.price != null && item.price > 0 && <WishBar saved={item.saved} price={item.price} />}
            <div className="wm-f">
              <span>Price</span>
              <input value={draft.price} onChange={(e) => setPrice(e.target.value)} placeholder="$0" inputMode="decimal" aria-label="Price" />
            </div>
            <div className="wm-bumps">
              <button onClick={() => onBump(item.id, 25)}>+ $25</button>
              <button onClick={() => onBump(item.id, 50)}>+ $50</button>
              <button onClick={() => onBump(item.id, 100)}>+ $100</button>
              <button className="neg" disabled={item.saved <= 0} onClick={() => onBump(item.id, -25)}>− $25</button>
              <button className="neg" disabled={item.saved <= 0} onClick={() => onBump(item.id, -50)}>− $50</button>
              <button className="neg" disabled={item.saved <= 0} onClick={() => onBump(item.id, -100)}>− $100</button>
            </div>
          </div>

          <label className="wm-f">
            <span>Why I want it</span>
            <textarea value={draft.note} onChange={(e) => setText("note", e.target.value)} placeholder="Add a note…" rows={3} />
          </label>

          <div className="wm-f">
            <span>Stage</span>
            <div className="wm-seg2 wrap">
              {STAGES.map((s) => (
                <button key={s.key} className={item.stage === s.key ? "on" : ""} onClick={() => onPatch(item.id, { stage: s.key })}>
                  <i style={{ background: s.dot }} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="wm-foot">
            {item.link && (
              <a className="wm-quick" href={item.link} target="_blank" rel="noreferrer noopener">
                <IconLink s={13} /> Link
              </a>
            )}
            <span className="wm-spring" />
            <button className="wm-del" onClick={() => onDel(item.id)}>
              Remove wish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
