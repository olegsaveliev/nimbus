/* Ephemeral UI/session state that isn't server data: which modal is open, the
 * active view, board-level filters, drag id, and the background Pomodoro timer
 * (which must keep running while its modal is closed). */
import { create } from "zustand";
import type { View } from "@/types";

export type ModalName =
  | "detail"
  | "manageCats"
  | "brief"
  | "help"
  | "settings"
  | "palette"
  | "focus"
  | "templates"
  | "addWithAI";

interface UIState {
  view: View;
  setView: (v: View) => void;

  /** Compact board density: collapse cards to title + priority dot. Persisted. */
  compact: boolean;
  toggleCompact: () => void;

  filter: string;
  setFilter: (f: string) => void;
  query: string;
  setQuery: (q: string) => void;

  dragId: string | null;
  setDragId: (id: string | null) => void;
  overCol: string | null;
  setOverCol: (k: string | null) => void;

  openId: string | null;
  setOpenId: (id: string | null) => void;

  modals: Record<ModalName, boolean>;
  openModal: (m: ModalName) => void;
  closeModal: (m: ModalName) => void;
  toggleModal: (m: ModalName) => void;

  flash: string[];
  setFlash: (ids: string[]) => void;

  toast: string;
  setToast: (t: string) => void;

  // background pomodoro
  pomoSecs: number;
  pomoRun: boolean;
  pomoMode: "work" | "break";
  pomoSessions: number;
  pomoTask: string | null;
  setPomoSecs: (fn: (s: number) => number) => void;
  setPomoTask: (id: string | null) => void;
  togglePomo: () => void;
  resetPomo: () => void;
  advancePomo: () => void; // called when the clock hits 0
}

const noModals: Record<ModalName, boolean> = {
  detail: false,
  manageCats: false,
  brief: false,
  help: false,
  settings: false,
  palette: false,
  focus: false,
  templates: false,
  addWithAI: false,
};

const COMPACT_KEY = "nimbus-compact";
const initialCompact = (() => {
  try {
    return localStorage.getItem(COMPACT_KEY) === "1";
  } catch {
    return false;
  }
})();

export const useUI = create<UIState>((set) => ({
  view: "board",
  setView: (view) => set({ view }),

  compact: initialCompact,
  toggleCompact: () =>
    set((s) => {
      const compact = !s.compact;
      try {
        localStorage.setItem(COMPACT_KEY, compact ? "1" : "0");
      } catch {
        /* ignore */
      }
      return { compact };
    }),

  filter: "All",
  setFilter: (filter) => set({ filter }),
  query: "",
  setQuery: (query) => set({ query }),

  dragId: null,
  setDragId: (dragId) => set({ dragId }),
  overCol: null,
  setOverCol: (overCol) => set({ overCol }),

  openId: null,
  setOpenId: (openId) => set({ openId }),

  modals: { ...noModals },
  openModal: (m) => set((s) => ({ modals: { ...s.modals, [m]: true } })),
  closeModal: (m) => set((s) => ({ modals: { ...s.modals, [m]: false } })),
  toggleModal: (m) => set((s) => ({ modals: { ...s.modals, [m]: !s.modals[m] } })),

  flash: [],
  setFlash: (flash) => set({ flash }),

  toast: "",
  setToast: (toast) => set({ toast }),

  pomoSecs: 25 * 60,
  pomoRun: false,
  pomoMode: "work",
  pomoSessions: 0,
  pomoTask: null,
  setPomoSecs: (fn) => set((s) => ({ pomoSecs: fn(s.pomoSecs) })),
  setPomoTask: (pomoTask) => set({ pomoTask }),
  togglePomo: () => set((s) => ({ pomoRun: !s.pomoRun })),
  resetPomo: () => set({ pomoRun: false, pomoMode: "work", pomoSecs: 25 * 60 }),
  advancePomo: () =>
    set((s) =>
      s.pomoMode === "work"
        ? { pomoSessions: s.pomoSessions + 1, pomoMode: "break", pomoSecs: 5 * 60 }
        : { pomoMode: "work", pomoSecs: 25 * 60 },
    ),
}));
