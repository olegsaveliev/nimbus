/* The 3-tab "Add a wish" modal: Quick capture (natural language), Paste a link,
 * and Full details. Centered over a blurred scrim via the shared Overlay. */
import { useMemo, useState } from "react";
import { emptyDraft, fmt$, PRI, smartParse, TYPES, type ParsedWish } from "@/domain/wishlist";
import type { Wish } from "@/types";
import { Overlay } from "@/components/common/Overlay";
import { IconArrowR, IconHeart, IconLink, IconPin, IconX } from "@/components/icons/Icons";
import { TYPE_ICON } from "./wishIcons";
import { WishThumb } from "./WishThumb";

/** What the modal hands back — matches useWishes().actions.addFull. */
export interface AddDraft {
  title: string;
  price?: string;
  saved?: string;
  pri?: Wish["pri"];
  type?: Wish["type"];
  where?: string;
  link?: string;
  note?: string;
  target?: string;
}

interface Props {
  onClose: () => void;
  onAdd: (draft: AddDraft) => void;
}

const fromParsed = (p: ParsedWish): AddDraft => ({
  title: p.title,
  type: p.type,
  pri: p.pri,
  where: p.where,
  link: p.link,
  note: p.note,
  price: p.price != null ? String(p.price) : "",
  saved: "",
});

export function WishAddModal({ onClose, onAdd }: Props) {
  const [tab, setTab] = useState<"quick" | "link" | "form">("quick");
  const [line, setLine] = useState("");
  const [url, setUrl] = useState("");
  const [d, setD] = useState(emptyDraft());
  const parsed = useMemo(() => smartParse(line), [line]);

  const commitQuick = () => {
    if (!line.trim()) return;
    onAdd(fromParsed(parsed));
  };
  const commitUrl = () => {
    if (!url.trim()) return;
    // NOTE: real link enrichment (title/image/price fetched from the URL) is a
    // backend task — see the hint below. Here we only derive the source domain.
    const p = smartParse(url);
    onAdd({
      ...fromParsed(p),
      title: p.title === "New wish" ? (p.where ? p.where + " — saved item" : "Linked wish") : p.title,
    });
  };
  const commitForm = () => {
    if (!d.title.trim()) return;
    onAdd(d);
  };

  return (
    <Overlay onClose={onClose} className="wl-modal-scrim">
      <div className="wl-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add a wish">
        <div className="wl-modal-head">
          <div className="wl-modal-ttl">
            <IconHeart s={16} /> Add a wish
          </div>
          <button className="wl-close" onClick={onClose} aria-label="Close">
            <IconX s={17} />
          </button>
        </div>

        <div className="wl-tabs">
          {(
            [
              ["quick", "Quick capture"],
              ["link", "Paste a link"],
              ["form", "Full details"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>

        {tab === "quick" && (
          <div className="wl-pane">
            <input
              className="wl-line"
              autoFocus
              value={line}
              onChange={(e) => setLine(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitQuick()}
              placeholder="e.g. Sony XM5 headphones $399 must have at Amazon"
            />
            <div className="wl-hint">
              Type naturally — we pull out the <b>price</b>, <b>priority</b> and <b>store</b>.
            </div>
            {line.trim() && (
              <div className="wl-preview">
                <WishThumb id="pv" title={parsed.title} type={parsed.type} r={11} iconSize={22} style={{ width: 46, height: 46 }} />
                <div className="wl-pv-body">
                  <div className="wl-pv-title">{parsed.title}</div>
                  <div className="wl-pv-tags">
                    {parsed.price != null && <span className="wl-pv-tag price">{fmt$(parsed.price)}</span>}
                    <span className="wl-pv-tag" style={{ color: PRI[parsed.pri].ink }}>
                      <i style={{ background: PRI[parsed.pri].c }} />
                      {PRI[parsed.pri].label}
                    </span>
                    <span className="wl-pv-tag">{tagTypeIcon(parsed.type)} {TYPES[parsed.type].label}</span>
                    {parsed.where && (
                      <span className="wl-pv-tag">
                        <IconPin s={11} />
                        {parsed.where}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <button className="wl-commit" disabled={!line.trim()} onClick={commitQuick}>
              Add wish <IconArrowR s={15} />
            </button>
          </div>
        )}

        {tab === "link" && (
          <div className="wl-pane">
            <div className="wl-url">
              <span>
                <IconLink s={16} />
              </span>
              <input
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitUrl()}
                placeholder="Paste a product or reference URL…"
              />
            </div>
            <div className="wl-hint">
              Drop a link from any store. <i>(In the real app, title, image and price are fetched automatically.)</i>
            </div>
            {url.trim() && smartParse(url).where && (
              <div className="wl-linkchip">
                <IconLink s={13} /> from <b>{smartParse(url).where}</b>
              </div>
            )}
            <button className="wl-commit" disabled={!url.trim()} onClick={commitUrl}>
              Save link <IconArrowR s={15} />
            </button>
          </div>
        )}

        {tab === "form" && (
          <div className="wl-pane wl-form">
            <input className="wl-f-title" autoFocus value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="What do you want?" />
            <label className="wl-f">
              <span>Type</span>
              <div className="wl-seg">
                {(Object.entries(TYPES) as Array<[Wish["type"], (typeof TYPES)[Wish["type"]]]>).map(([k, vv]) => {
                  const Ic = TYPE_ICON[vv.ic];
                  return (
                    <button key={k} className={d.type === k ? "on" : ""} onClick={() => setD({ ...d, type: k })}>
                      <Ic s={14} /> {vv.label}
                    </button>
                  );
                })}
              </div>
            </label>
            <div className="wl-f-row two">
              <label className="wl-f">
                <span>Price</span>
                <input value={d.price} onChange={(e) => setD({ ...d, price: e.target.value.replace(/[^\d.]/g, "") })} placeholder="$0" inputMode="decimal" />
              </label>
              <label className="wl-f">
                <span>Already saved</span>
                <input value={d.saved} onChange={(e) => setD({ ...d, saved: e.target.value.replace(/[^\d.]/g, "") })} placeholder="$0" inputMode="decimal" />
              </label>
            </div>
            <div className="wl-f-row two">
              <label className="wl-f">
                <span>Where</span>
                <input value={d.where} onChange={(e) => setD({ ...d, where: e.target.value })} placeholder="Store or source" />
              </label>
              <label className="wl-f">
                <span>Target date</span>
                <input value={d.target} onChange={(e) => setD({ ...d, target: e.target.value })} placeholder="e.g. Oct 2026" />
              </label>
            </div>
            <label className="wl-f">
              <span>How much do you want it?</span>
              <div className="wl-seg">
                {(Object.entries(PRI) as Array<[Wish["pri"], (typeof PRI)[Wish["pri"]]]>).map(([k, vv]) => (
                  <button key={k} className={d.pri === k ? "on" : ""} onClick={() => setD({ ...d, pri: k })}>
                    <i style={{ background: vv.c }} />
                    {vv.label}
                  </button>
                ))}
              </div>
            </label>
            <label className="wl-f">
              <span>Why I want it</span>
              <textarea value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="Optional note…" rows={2} />
            </label>
            <button className="wl-commit" disabled={!d.title.trim()} onClick={commitForm}>
              Add wish <IconArrowR s={15} />
            </button>
          </div>
        )}
      </div>
    </Overlay>
  );
}

function tagTypeIcon(type: Wish["type"]) {
  const Ic = TYPE_ICON[TYPES[type].ic];
  return <Ic s={11} />;
}
