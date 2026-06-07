/* Right-side detail drawer for a wish. Slides in over a blurred scrim (reusing
 * the shared Overlay for Esc / backdrop close). Everything is editable inline
 * and patches immediately. */
import { useState } from "react";
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
            value={item.title}
            onChange={(e) => onPatch(item.id, { title: e.target.value })}
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
              <input value={item.where === "—" ? "" : item.where} onChange={(e) => onPatch(item.id, { where: e.target.value })} placeholder="Store or source" />
            </label>
            <label className="wl-f">
              <span>Target date</span>
              <input value={item.target} onChange={(e) => onPatch(item.id, { target: e.target.value })} placeholder="e.g. Oct 2026" />
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
                  value={item.price ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, "");
                    const n = parseFloat(v);
                    const price = v && !isNaN(n) ? n : null;
                    // Re-derive the stage so a price change can't leave the wish in
                    // a bucket its money no longer matches (e.g. Ready but underfunded).
                    onPatch(item.id, { price, stage: deriveStage(item.saved, price, item.stage) });
                  }}
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
              </div>
            </div>
          </div>

          <label className="wl-f">
            <span>Why I want it</span>
            <textarea className="wl-note" value={item.note} onChange={(e) => onPatch(item.id, { note: e.target.value })} placeholder="Add a note…" rows={3} />
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
