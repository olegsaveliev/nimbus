/* Global ⌘K / Ctrl+K to toggle the command palette. */
import { useEffect } from "react";
import { useUI } from "@/state/uiStore";

export function useCommandPaletteHotkey() {
  const toggleModal = useUI((s) => s.toggleModal);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        toggleModal("palette");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [toggleModal]);
}
