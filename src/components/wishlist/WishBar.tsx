/* Savings progress bar: fills with the accent, turns green at 100%. */
import { DONE_GREEN, savedPct } from "@/domain/wishlist";

interface Props {
  saved: number;
  price: number | null;
}

export function WishBar({ saved, price }: Props) {
  const pct = savedPct(saved, price);
  const done = pct >= 100;
  return (
    <div className="wl-bar">
      <span style={{ width: pct + "%", background: done ? DONE_GREEN : "var(--accent)" }} />
    </div>
  );
}
