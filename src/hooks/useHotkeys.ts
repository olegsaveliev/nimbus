/* Global keyboard shortcuts: ⌘K / Ctrl+K toggles the command palette; plain "C"
 * toggles compact board density (ignored while typing in a field). */
import { useEffect } from "react";
import { useUI } from "@/state/uiStore";

export function useHotkeys() {
  const toggleModal = useUI((s) => s.toggleModal);
  const toggleCompact = useUI((s) => s.toggleCompact);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        toggleModal("palette");
        return;
      }
      // Plain-key shortcuts: skip while editing text or with a modifier held.
      const el = e.target as HTMLElement | null;
      const editing =
        !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (editing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c" || e.key === "C") toggleCompact();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [toggleModal, toggleCompact]);
}
