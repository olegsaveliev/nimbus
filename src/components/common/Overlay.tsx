/* Shared modal overlay: dims the backdrop, closes on Esc / backdrop click, and
 * stops propagation inside the panel. All modals share the prototype's .overlay. */
import { useEffect, type ReactNode } from "react";

interface OverlayProps {
  onClose: () => void;
  children: ReactNode;
  /** Extra class on the overlay (e.g. "cmdk-overlay" for the palette). */
  className?: string;
}

export function Overlay({ onClose, children, className }: OverlayProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className={"overlay" + (className ? " " + className : "")} onClick={onClose}>
      {children}
    </div>
  );
}
