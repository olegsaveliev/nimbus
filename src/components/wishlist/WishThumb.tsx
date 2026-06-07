/* Deterministic wish thumbnail: the type icon in white on a per-type gradient,
 * with the gradient angle hashed from id+title (matches the prototype's Thumb). */
import { TYPES, thumbAngle } from "@/domain/wishlist";
import type { WishType } from "@/types";
import { TYPE_ICON } from "./wishIcons";

interface Props {
  id: string;
  title: string;
  type: WishType;
  /** Border radius in px. */
  r?: number;
  /** Icon size in px. */
  iconSize?: number;
  style?: React.CSSProperties;
}

export function WishThumb({ id, title, type, r = 11, iconSize = 24, style }: Props) {
  const t = TYPES[type] || TYPES.buy;
  const Icon = TYPE_ICON[t.ic];
  const ang = thumbAngle(id, title);
  return (
    <div
      className="wl-thumb"
      style={{ borderRadius: r, background: `linear-gradient(${ang}deg, ${t.g[0]}, ${t.g[1]})`, ...style }}
    >
      <span className="wl-thumb-glyph">
        <Icon s={iconSize} />
      </span>
      <span className="wl-thumb-sheen" />
    </div>
  );
}
