/* Maps the domain's icon keys (TYPES.ic, BUCKETS.icon, rail filters) to the
 * app's shared line icons, so the Wishlist uses our icon set — not the
 * prototype's inline SVGs. Every icon inherits currentColor. */
import {
  IconBag,
  IconCircleCheck,
  IconCompass,
  IconFlameLine,
  IconGift,
  IconGrid,
  IconMoon,
  IconTarget,
  IconWallet,
} from "@/components/icons/Icons";

type IconCmp = (props: { s?: number }) => JSX.Element;

/** Wish type → icon (also used by the rail's To buy / Goals / Experiences filters). */
export const TYPE_ICON: Record<"bag" | "target" | "compass", IconCmp> = {
  bag: IconBag,
  target: IconTarget,
  compass: IconCompass,
};

/** Feed bucket → accent line icon. */
export const BUCKET_ICON: Record<"circleCheck" | "flame" | "wallet" | "moon" | "gift", IconCmp> = {
  circleCheck: IconCircleCheck,
  flame: IconFlameLine,
  wallet: IconWallet,
  moon: IconMoon,
  gift: IconGift,
};

/** "Everything" rail filter. */
export const GRID_ICON: IconCmp = IconGrid;
