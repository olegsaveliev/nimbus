/* The Wishlist space: a left rail (space switcher, search, "left to save"
 * headline, type filters, theme swatches) + a main column with the smart capture
 * bar and a self-sorting feed grouped into buckets. A separate top-level space
 * beside the task boards; reached via the top-bar switcher (view === "wishlist").
 *
 * Theme uses the app's global preferences system (passed in), not a local store.
 * Persistence is the per-user `wishes` table via useWishes. */
import { useMemo, useRef, useState } from "react";
import { useWishes } from "@/data/useWishes";
import { THEMES, grad } from "@/domain/themes";
import {
  BUCKETS,
  bucketOf,
  fmt$,
  PRI,
  smartParse,
  totals,
  TYPES,
  type BucketKey,
} from "@/domain/wishlist";
import type { Wish, WishType } from "@/types";
import {
  IconArrowR,
  IconCheckSq,
  IconHeart,
  IconLink,
  IconPin,
  IconPlus,
  IconSearch,
  IconSpark,
} from "@/components/icons/Icons";
import { BUCKET_ICON, GRID_ICON, TYPE_ICON } from "@/components/wishlist/wishIcons";
import { WishRow } from "@/components/wishlist/WishRow";
import { WishDrawer } from "@/components/wishlist/WishDrawer";
import { WishAddModal } from "@/components/wishlist/WishAddModal";

interface Props {
  /** Active global theme index (from preferences). */
  theme: number;
  onSelectTheme: (i: number) => void;
  /** Switch back to the task boards. */
  onBackToTasks: () => void;
}

type Filter = "all" | WishType;
const FILTERS: Array<[Filter, "bag" | "target" | "compass" | "grid", string]> = [
  ["all", "grid", "Everything"],
  ["buy", "bag", "To buy"],
  ["goal", "target", "Goals"],
  ["exp", "compass", "Experiences"],
];
const FILT_LABEL: Record<Filter, string> = { all: "", buy: "To buy", goal: "Goals", exp: "Experiences" };
const TRY = ["Two weeks in Japan $3500", "Learn to surf someday", "Standing desk $620 want"];

export function WishlistView({ theme, onSelectTheme, onBackToTasks }: Props) {
  const { wishes, actions } = useWishes();
  const [v, setV] = useState("");
  const [focus, setFocus] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [filt, setFilt] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUrl = /https?:\/\//i.test(v);
  const parsed = useMemo(() => smartParse(v), [v]);

  const flashNew = (id: string | null) => {
    if (!id) return;
    setFlashId(id);
    setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 1500);
  };

  const commit = () => {
    if (!v.trim()) return;
    const id = actions.add(v);
    flashNew(id);
    setV("");
    inputRef.current?.focus();
  };

  // active-filter view of the list (drives both the feed and the headline stat)
  const f = wishes.filter((i) => {
    if (filt !== "all" && i.type !== filt) return false;
    if (q && !((i.title + " " + i.where).toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  const Tf = totals(f);

  const grouped = useMemo(() => {
    const map = new Map<BucketKey, Wish[]>();
    for (const w of f) {
      const k = bucketOf(w);
      const arr = map.get(k);
      if (arr) arr.push(w);
      else map.set(k, [w]);
    }
    return BUCKETS.map((b) => ({ ...b, items: map.get(b.key) ?? [] })).filter((b) => b.items.length);
  }, [f]);

  const detail = openId ? wishes.find((i) => i.id === openId) : undefined;

  return (
    <div className="wl">
      <div className="wl-stage">
        {/* rail */}
        <div className="wl-rail wl-glass">
          <div className="wl-spaceseg">
            <button type="button" onClick={onBackToTasks} title="Go to your tasks">
              <IconCheckSq s={14} />
              Tasks
            </button>
            <span className="on">
              <IconHeart s={14} />
              Wishlist
            </span>
          </div>

          <div className="wl-search">
            <span className="ic">
              <IconSearch />
            </span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search wishes…" aria-label="Search wishes" />
          </div>

          <div className="wl-rail-big">
            <div className="v">{fmt$(Tf.remaining)}</div>
            <div className="l">
              left to save {filt === "all" ? "across" : "in " + FILT_LABEL[filt] + " ·"} {Tf.count} {Tf.count === 1 ? "wish" : "wishes"}
            </div>
            <div className="wl-rail-bar">
              <span style={{ width: (Tf.goal ? (Tf.saved / Tf.goal) * 100 : 0) + "%" }} />
            </div>
            <div className="wl-rail-sub">
              {fmt$(Tf.saved)} saved of {fmt$(Tf.goal)}
            </div>
          </div>

          <div className="wl-rail-lbl">Filter</div>
          {FILTERS.map(([k, icKey, label]) => {
            const Ic = icKey === "grid" ? GRID_ICON : TYPE_ICON[icKey];
            const n = k === "all" ? wishes.length : wishes.filter((i) => i.type === k).length;
            return (
              <button key={k} className={"wl-rail-f" + (filt === k ? " on" : "")} onClick={() => setFilt(k)}>
                <span className="wl-f-ic">
                  <Ic s={15} />
                </span>
                {label}
                <span className="n">{n}</span>
              </button>
            );
          })}

          <div className="wl-rail-lbl" style={{ marginTop: 6 }}>
            Theme
          </div>
          <div className="wl-acc">
            {THEMES.map((t, i) => (
              <button
                key={t.name}
                className={theme === i ? "on" : ""}
                title={t.name}
                aria-label={t.name}
                style={{ background: grad(t.bg) }}
                onClick={() => onSelectTheme(i)}
              />
            ))}
          </div>

          <div className="wl-rail-foot">
            {Tf.ready} ready · {Tf.got} done
          </div>
        </div>

        {/* main */}
        <div className="wl-main">
          <div className={"wl-capture wl-glass" + (focus ? " wl-focus" : "") + (isUrl ? " url" : "")}>
            <span className="wl-cap-icon">{isUrl ? <IconLink s={19} /> : <IconSpark />}</span>
            <input
              ref={inputRef}
              value={v}
              onChange={(e) => setV(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              onKeyDown={(e) => e.key === "Enter" && commit()}
              placeholder="Wish for anything… “AirPods Pro $249 must have”, a goal, or paste a link"
              aria-label="Capture a wish"
            />
            <button className="wl-cap-more" title="Add with full details" aria-label="Add with full details" onClick={() => setAdding(true)}>
              <IconPlus />
            </button>
            {v.trim() && (
              <button className="wl-cap-go" onClick={commit}>
                Add <IconArrowR s={15} />
              </button>
            )}
          </div>

          {!v.trim() && (
            <div className="wl-eg">
              <span>Try</span>
              <div className="wl-eg-list">
                {TRY.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setV(s);
                      inputRef.current?.focus();
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {v.trim() && (
            <div className="wl-parse">
              <span className="wl-parse-lead">{isUrl ? "Saving from link" : "I'll file this as"}</span>
              <span className="wl-pt">{parseTypeIcon(parsed.type)} {TYPES[parsed.type].label}</span>
              {parsed.price != null && <span className="wl-pt price">{fmt$(parsed.price)}</span>}
              <span className="wl-pt" style={{ color: PRI[parsed.pri].ink }}>
                <i style={{ background: PRI[parsed.pri].c }} />
                {PRI[parsed.pri].label}
              </span>
              {parsed.where && (
                <span className="wl-pt">
                  <IconPin s={11} />
                  {parsed.where}
                </span>
              )}
              <span className="wl-parse-arrow">→ {parsed.title}</span>
            </div>
          )}

          <div className="wl-feed">
            {grouped.map((b) => {
              const BIcon = BUCKET_ICON[b.icon];
              return (
                <div className="wl-bucket" key={b.key}>
                  <div className="wl-bucket-head">
                    <span className="wl-bucket-ic">
                      <BIcon s={16} />
                    </span>
                    <span className="wl-bucket-name">{b.name}</span>
                    {b.desc && <span className="wl-bucket-desc">{b.desc}</span>}
                    <span className="wl-bucket-n">{b.items.length}</span>
                  </div>
                  <div className="wl-rows">
                    {b.items.map((it) => (
                      <WishRow
                        key={it.id}
                        item={it}
                        flash={flashId === it.id}
                        onOpen={() => setOpenId(it.id)}
                        onPri={actions.cyclePri}
                        onBump={actions.bump}
                        onPatch={actions.patch}
                        onDel={(id) => {
                          actions.del(id);
                          setOpenId((cur) => (cur === id ? null : cur));
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {!grouped.length && (
              <div className="wl-blank">
                {q || filt !== "all" ? "No wishes match — try clearing the filter." : "No wishes yet — capture one above ↑"}
              </div>
            )}
          </div>
        </div>
      </div>

      {detail && (
        <WishDrawer
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
        <WishAddModal
          onClose={() => setAdding(false)}
          onAdd={(draft) => {
            const id = actions.addFull(draft);
            flashNew(id);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

function parseTypeIcon(type: WishType) {
  const Ic = TYPE_ICON[TYPES[type].ic];
  return <Ic s={13} />;
}
