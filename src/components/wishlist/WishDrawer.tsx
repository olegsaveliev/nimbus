/* Right-side detail drawer for a wish. Slides in over a blurred scrim (reusing
 * the shared Overlay for Esc / backdrop close). Everything is editable inline
 * and patches immediately. */
import { useEffect, useState } from "react";
import { deriveStage, fmt$, PRI, savedPct, STAGES, TYPES } from "@/domain/wishlist";
import type { Wish } from "@/types";
import { Overlay } from "@/components/common/Overlay";
import { IconLink, IconX } from "@/components/icons/Icons";
import { TYPE_ICON } from "./wishIcons";
import { WishThumb } from "./WishThumb";
import { WishBar } from "./WishBar";

interface Props {
  item: Wish;
  onClose: () => void;
  onPatch: (id: string, d: Partial<Wish>) => void;
  onBump: (id: string, amount: number) => void;
  onDel: (id: string) => void;
}

export function WishDrawer({ item, onClose, onPatch, onBump, onDel }: Props) {
  const [custom, setCustom] = useState("");
  // Text fields are controlled by *local* state, then propagated to the cache via
  // onPatch. Binding value directly to the cache-derived `item` made the caret
  // jump to the end on every keystroke: React Query notifies asynchronously, so
  // the re-render misses the keystroke's event and React restores the field to
  // its last-rendered value. Local state updates synchronously and avoids that.
  const [draft, setDraft] = useState(() => ({
    title: item.title,
    where: item.where === "—" ? "" : item.where,
    target: item.target,
    note: item.note,
    link: item.link,
    // kept as a raw string so partial decimals (e.g. "12.") survive typing
    price: item.price != null ? String(item.price) : "",
  }));
  // Re-seed only when a *different* wish opens — not on every cache update, so
  // in-progress typing stays locally owned.
  const id = item.id;
  useEffect(() => {
    setDraft({
      title: item.title,
      where: item.where === "—" ? "" : item.where,
      target: item.target,
      note: item.note,
      link: item.link,
      price: item.price != null ? String(item.price) : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setText = (key: "title" | "where" | "target" | "note" | "link", v: string) => {
    setDraft((p) => ({ ...p, [key]: v }));
    onPatch(item.id, { [key]: v } as Partial<Wish>);
  };
  const setPrice = (raw: string) => {
    const v = raw.replace(/[^\d.]/g, "");
    setDraft((p) => ({ ...p, price: v }));
    const n = parseFloat(v);
    const price = v && !isNaN(n) ? n : null;
    // Re-derive the stage so a price change can't leave the wish in a bucket its
    // money no longer matches (e.g. Ready but underfunded).
    onPatch(item.id, { price, stage: deriveStage(item.saved, price, item.stage) });
  };

  const t = TYPES[item.type];
  const TypeIcon = TYPE_ICON[t.ic];
  const pct = savedPct(item.saved, item.price);

  return (
    <Overlay onClose={onClose} className="wl-drawer-scrim">
      <div className="wl-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={item.title || "Wish details"}>
        <div className="wl-hero">
          <WishThumb id={item.id} title={item.title} type={item.type} r={0} iconSize={40} style={{ height: "100%", width: "100%" }} />
          <button className="wl-close on-hero" onClick={onClose} aria-label="Close">
            <IconX s={17} />
          </button>
          <span className="wl-type-pill">
            <TypeIcon s={12} /> {t.label}
          </span>
        </div>

        <div className="wl-drawer-body">
          <input
            className="wl-drawer-title"
            value={draft.title}
            onChange={(e) => setText("title", e.target.value)}
            placeholder="Name this wish…"
            aria-label="Title"
          />

          <div className="wl-d-grid">
            <label className="wl-f">
              <span>Type</span>
              <div className="wl-seg">
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
            <label className="wl-f">
              <span>How much you want it</span>
              <div className="wl-seg">
                {(Object.entries(PRI) as Array<[Wish["pri"], (typeof PRI)[Wish["pri"]]]>).map(([k, vv]) => (
                  <button key={k} className={item.pri === k ? "on" : ""} onClick={() => onPatch(item.id, { pri: k })} title={vv.label} aria-label={vv.label}>
                    <i style={{ background: vv.c }} />
                  </button>
                ))}
              </div>
            </label>
            <label className="wl-f">
              <span>Where</span>
              <input value={draft.where} onChange={(e) => setText("where", e.target.value)} placeholder="Store or source" />
            </label>
            <label className="wl-f">
              <span>Target date</span>
              <input value={draft.target} onChange={(e) => setText("target", e.target.value)} placeholder="e.g. Oct 2026" />
            </label>
          </div>

          <div className="wl-save">
            <div className="wl-save-money">
              <b>{fmt$(item.saved)}</b>
              <span>{item.price != null ? "saved of " + fmt$(item.price) + " · " + pct + "%" : "saved"}</span>
            </div>
            {item.price != null && item.price > 0 && <WishBar saved={item.saved} price={item.price} />}
            <div className="wl-price-edit">
              <span>Price</span>
              <div className="wl-price-in">
                <b>$</b>
                <input
                  value={draft.price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                  aria-label="Price"
                />
              </div>
            </div>
            <div className="wl-bumps">
              <button onClick={() => onBump(item.id, 25)}>+ $25</button>
              <button onClick={() => onBump(item.id, 50)}>+ $50</button>
              <button onClick={() => onBump(item.id, 100)}>+ $100</button>
              <div className="wl-custom">
                <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))} placeholder="custom" inputMode="decimal" aria-label="Custom amount" />
                <button
                  disabled={!custom}
                  onClick={() => {
                    onBump(item.id, parseFloat(custom) || 0);
                    setCustom("");
                  }}
                >
                  Add
                </button>
                <button
                  className="neg"
                  disabled={!custom || item.saved <= 0}
                  onClick={() => {
                    onBump(item.id, -(parseFloat(custom) || 0));
                    setCustom("");
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <label className="wl-f">
            <span>Why I want it</span>
            <textarea className="wl-note" value={draft.note} onChange={(e) => setText("note", e.target.value)} placeholder="Add a note…" rows={3} />
          </label>

          <label className="wl-f">
            <span>Link</span>
            <input value={draft.link} onChange={(e) => setText("link", e.target.value)} placeholder="Paste a store link…" inputMode="url" />
          </label>

          <div className="wl-stage-field">
            <span className="wl-f-lbl">Stage</span>
            <div className="wl-seg full">
              {STAGES.map((s) => (
                <button key={s.key} className={item.stage === s.key ? "on" : ""} onClick={() => onPatch(item.id, { stage: s.key })}>
                  <i style={{ background: s.dot }} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="wl-drawer-foot">
            {item.link && (
              <a className="wl-drawer-link" href={item.link} target="_blank" rel="noreferrer noopener">
                <IconLink s={14} /> Open link
              </a>
            )}
            <span className="wl-foot-spring" />
            <button className="wl-drawer-del" onClick={() => onDel(item.id)}>
              Remove wish
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
