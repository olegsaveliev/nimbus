/* A single feed row — clickable to open the detail drawer. Shows the type
 * thumbnail, title + meta, savings progress (or "Got it" / "no price yet"), a
 * cyclable priority pill, and contextual inline actions. Inline action clicks
 * stop propagation so they don't also open the drawer. */
import { fmt$, PRI, TYPES } from "@/domain/wishlist";
import type { Wish } from "@/types";
import { IconCal, IconCart, IconCheckLine, IconX } from "@/components/icons/Icons";
import { TYPE_ICON } from "./wishIcons";
import { WishThumb } from "./WishThumb";
import { WishBar } from "./WishBar";

interface Props {
  item: Wish;
  flash: boolean;
  onOpen: () => void;
  onPri: (id: string) => void;
  onBump: (id: string, amount: number) => void;
  onPatch: (id: string, d: Partial<Wish>) => void;
  onDel: (id: string) => void;
}

export function WishRow({ item, flash, onOpen, onPri, onBump, onPatch, onDel }: Props) {
  const t = TYPES[item.type];
  const pr = PRI[item.pri];
  const TypeIcon = TYPE_ICON[t.ic];
  const got = item.stage === "got";
  const ready = item.stage === "ready";
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      className={"wl-row" + (flash ? " flash" : "") + (got ? " got" : "")}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <WishThumb id={item.id} title={item.title} type={item.type} r={11} style={{ width: 44, height: 44, flex: "none" }} />

      <div className="wl-row-main">
        <div className="wl-row-title">{item.title}</div>
        <div className="wl-row-meta">
          <span>
            <TypeIcon s={12} /> {t.label}
          </span>
          {item.where && item.where !== "—" && <span>· {item.where}</span>}
          {item.target && (
            <span>
              · <IconCal /> {item.target}
            </span>
          )}
        </div>
      </div>

      {item.price != null && item.price > 0 && !got && (
        <div className="wl-row-prog">
          <div className="wl-row-money">
            <b>{fmt$(item.saved)}</b> / {fmt$(item.price)}
          </div>
          <WishBar saved={item.saved} price={item.price} />
        </div>
      )}
      {got && (
        <div className="wl-row-gotlbl">
          <IconCheckLine s={13} /> Got it
        </div>
      )}
      {(item.price == null || item.price <= 0) && !got && <div className="wl-row-noprice">no price yet</div>}

      <button
        className="wl-row-pri"
        style={{ background: pr.soft, color: pr.ink }}
        title="Tap to change priority"
        onClick={stop(() => onPri(item.id))}
      >
        <i style={{ background: pr.c }} />
        {pr.label}
      </button>

      <div className="wl-row-acts" onClick={(e) => e.stopPropagation()}>
        {!got && ready && (
          <button className="wl-act got" onClick={() => onPatch(item.id, { stage: "got" })}>
            <IconCart s={13} /> Got it
          </button>
        )}
        {!got && !ready && item.price != null && item.price > 0 && (
          <button className="wl-act" onClick={() => onBump(item.id, 50)}>
            + $50
          </button>
        )}
        {got && (
          <button className="wl-act" onClick={() => onPatch(item.id, { stage: "ready" })}>
            Undo
          </button>
        )}
        <button className="wl-act icon" title="Delete wish" aria-label="Delete wish" onClick={() => onDel(item.id)}>
          <IconX s={14} />
        </button>
      </div>
    </div>
  );
}
