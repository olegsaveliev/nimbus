/* Wishlist (mobile) — the "stream" variant from the mobile design handoff:
 * a fixed header (brand, theme, app switch, savings summary + ring, type-filter
 * chips) over a scrolling feed of self-sorting buckets, plus a FAB that opens
 * the smart-capture add sheet. Same data layer as the desktop Wishlist
 * (useWishes / domain/wishlist) — only the shell is phone-specific. */
import { useMemo, useState } from "react";
import { useWishes } from "@/data/useWishes";
import { BUCKETS, bucketOf, fmt$, PRI, totals, TYPES, type BucketKey } from "@/domain/wishlist";
import type { Wish, WishType } from "@/types";
import { IconCal, IconCart, IconCheckLine, IconHeart, IconPlus } from "@/components/icons/Icons";
import { BUCKET_ICON, GRID_ICON, TYPE_ICON } from "@/components/wishlist/wishIcons";
import { WishThumb } from "@/components/wishlist/WishThumb";
import { WishBar } from "@/components/wishlist/WishBar";
import { AppSeg, MiniRing, ThemeSwatch } from "./MobileBits";
import { WishDetailSheet } from "./WishDetailSheet";
import { WishAddSheet } from "./WishAddSheet";

interface Props {
  theme: number;
  onSelectTheme: (i: number) => void;
  onBackToTasks: () => void;
}

type Filter = "all" | WishType;
const FILTERS: Array<[Filter, "bag" | "target" | "compass" | "grid", string]> = [
  ["all", "grid", "Everything"],
  ["buy", "bag", "To buy"],
  ["goal", "target", "Goals"],
  ["exp", "compass", "Experiences"],
];

export function WishlistMobile({ theme, onSelectTheme, onBackToTasks }: Props) {
  const { wishes, actions } = useWishes();
  const [filt, setFilt] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);

  const flashNew = (id: string | null) => {
    if (!id) return;
    setFlashId(id);
    setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 1500);
  };

  const typed = wishes.filter((i) => filt === "all" || i.type === filt);
  const T = totals(typed);
  const pct = T.goal ? Math.round((T.saved / T.goal) * 100) : 0;

  const grouped = useMemo(() => {
    const map = new Map<BucketKey, Wish[]>();
    for (const w of typed) {
      const k = bucketOf(w);
      const arr = map.get(k);
      if (arr) arr.push(w);
      else map.set(k, [w]);
    }
    return BUCKETS.map((b) => ({ ...b, items: map.get(b.key) ?? [] })).filter((b) => b.items.length);
  }, [typed]);

  const detail = openId ? wishes.find((i) => i.id === openId) : undefined;

  return (
    <div className="nfm">
      <div className="nfm-stage">
        {/* header */}
        <div className="wm-head">
          <div className="wm-head-row">
            <div className="wm-logo">
              <IconHeart s={19} />
            </div>
            <div className="wm-titles">
              <span className="wm-eyebrow">Nimbus</span>
              <h1>Wishlist</h1>
            </div>
            <div className="wm-head-right">
              <ThemeSwatch theme={theme} onSelectTheme={onSelectTheme} />
              <AppSeg active="wishlist" onTasks={onBackToTasks} onWishlist={() => {}} />
            </div>
          </div>

          <div className="wm-sum glass">
            <div className="wm-sum-main">
              <div className="wm-sum-top">
                <span className="wm-sum-big">{fmt$(T.remaining)}</span>
                <span className="wm-sum-lbl">left to save</span>
              </div>
              <WishBar saved={T.saved} price={T.goal} />
              <span className="wm-sum-sub">
                {fmt$(T.saved)} saved of {fmt$(T.goal)} · {T.count} {T.count === 1 ? "wish" : "wishes"}
              </span>
            </div>
            <MiniRing pct={pct} label="saved" kind="wm" />
          </div>

          <div className="wm-chips">
            {FILTERS.map(([k, icKey, label]) => {
              const Ic = icKey === "grid" ? GRID_ICON : TYPE_ICON[icKey];
              const n = k === "all" ? wishes.length : wishes.filter((i) => i.type === k).length;
              return (
                <button key={k} className={"wm-chip" + (filt === k ? " on" : "")} onClick={() => setFilt(k)}>
                  <Ic s={14} />
                  {label}
                  <span className="n">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* feed */}
        <div className="wm-feed">
          {grouped.length ? (
            grouped.map((b) => {
              const BIcon = BUCKET_ICON[b.icon];
              return (
                <div className="wm-bucket" key={b.key}>
                  <div className="wm-bucket-head">
                    <span className="wm-bucket-ic">
                      <BIcon s={16} />
                    </span>
                    <span className="wm-bucket-name">{b.name}</span>
                    {b.desc && <span className="wm-bucket-desc">{b.desc}</span>}
                    <span className="wm-bucket-n">{b.items.length}</span>
                  </div>
                  <div className="wm-rows">
                    {b.items.map((it) => (
                      <Row
                        key={it.id}
                        item={it}
                        flash={flashId === it.id}
                        onOpen={() => setOpenId(it.id)}
                        onPri={actions.cyclePri}
                        onBump={actions.bump}
                        onPatch={actions.patch}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="wm-blank">
              No wishes here — try another filter,
              <br />
              or tap + to add one.
            </div>
          )}
        </div>

        <button className="wm-fab" onClick={() => setAdding(true)} aria-label="Add a wish">
          <IconPlus />
        </button>
      </div>

      {detail && (
        <WishDetailSheet
          item={detail}
          onClose={() => setOpenId(null)}
          onPatch={actions.patch}
          onBump={actions.bump}
          onDel={(id) => {
            actions.del(id);
            setOpenId(null);
          }}
        />
      )}
      {adding && (
        <WishAddSheet
          onClose={() => setAdding(false)}
          onQuick={(line) => {
            flashNew(actions.add(line));
            setAdding(false);
          }}
          onFull={(draft) => {
            flashNew(actions.addFull(draft));
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- feed row card ---------------- */
interface RowProps {
  item: Wish;
  flash: boolean;
  onOpen: () => void;
  onPri: (id: string) => void;
  onBump: (id: string, amount: number) => void;
  onPatch: (id: string, d: Partial<Wish>) => void;
}

function Row({ item, flash, onOpen, onPri, onBump, onPatch }: RowProps) {
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
    <button type="button" className={"wm-row glass" + (flash ? " flash" : "") + (got ? " got" : "")} onClick={onOpen}>
      <div className="wm-row-head">
        <WishThumb id={item.id} title={item.title} type={item.type} r={13} style={{ width: 48, height: 48 }} />
        <div className="wm-row-main">
          <div className="wm-row-title">{item.title}</div>
          <div className="wm-row-meta">
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
        <span
          className="wm-pri"
          role="button"
          title="Tap to change priority"
          style={{ background: pr.soft, color: pr.ink }}
          onClick={stop(() => onPri(item.id))}
        >
          <i style={{ background: pr.c }} />
          {pr.label}
        </span>
      </div>

      <div className="wm-row-foot">
        {got ? (
          <>
            <span className="wm-row-gotlbl">
              <IconCheckLine s={13} /> Got it
            </span>
            <span className="wm-quick" role="button" onClick={stop(() => onPatch(item.id, { stage: "ready" }))}>
              Undo
            </span>
          </>
        ) : item.price != null && item.price > 0 ? (
          <>
            <div className="wm-prog">
              <div className="wm-prog-money">
                <b>{fmt$(item.saved)}</b> / {fmt$(item.price)}
              </div>
              <WishBar saved={item.saved} price={item.price} />
            </div>
            {ready ? (
              <span className="wm-quick go" role="button" onClick={stop(() => onPatch(item.id, { stage: "got" }))}>
                <IconCart s={13} /> Got it
              </span>
            ) : (
              <span className="wm-quick" role="button" onClick={stop(() => onBump(item.id, 50))}>
                + $50
              </span>
            )}
          </>
        ) : (
          <>
            <span className="wm-row-noprice">No price yet</span>
            <span className="wm-quick" role="button" onClick={stop(onOpen)}>
              Plan
            </span>
          </>
        )}
      </div>
    </button>
  );
}
