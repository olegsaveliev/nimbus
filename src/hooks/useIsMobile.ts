/* Phone detection for the mobile screens. A live matchMedia subscription (not a
 * one-shot innerWidth read) so rotating/resizing swaps layouts without a
 * reload. 640px keeps the existing 820px tablet tweaks in nimbus.css in charge
 * of mid-size screens; only true phone widths get the dedicated mobile UI. */
import { useSyncExternalStore } from "react";

export const MOBILE_QUERY = "(max-width: 640px)";

const mql = typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY) : null;

function subscribe(onChange: () => void): () => void {
  mql?.addEventListener("change", onChange);
  return () => mql?.removeEventListener("change", onChange);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => mql?.matches ?? false);
}
