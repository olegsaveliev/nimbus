/* In-app backdrop / design themes — ported from app.jsx. */
import type { Theme, Tweaks } from "@/types";

export const DEFAULT_THEME = 6; /* Midnight */

export const THEMES: Theme[] = [
  { name: "Sunset", bg: ["#ffd5a6", "#ff9a8b", "#ff6a88"], accent: "#7c5cff" },
  { name: "Blossom", bg: ["#a18cd1", "#fbc2eb", "#ff9a9e"], accent: "#c026d3" },
  { name: "Aurora", bg: ["#84fab0", "#8fd3f4", "#a6c1ee"], accent: "#0ea5e9" },
  { name: "Twilight", bg: ["#2b1055", "#7597de", "#ff6a88"], accent: "#ff6b9d" },
  { name: "Coral", bg: ["#ffecd2", "#fcb69f", "#ff8177"], accent: "#14b8a6" },
  { name: "Frozen", bg: ["#dbe6f6", "#c6d6ee", "#aec6e6"], accent: "#3b82f6", ink: "#243245", muted: "60,78,104" },
  {
    name: "Midnight",
    bg: ["#13111f", "#211b38", "#3a2f63"],
    accent: "#a78bfa",
    ink: "#ece9f7",
    muted: "188,182,214",
    surf: "122,112,158",
    dark: true,
  },
];

export const grad = (bg: [string, string, string]): string => `linear-gradient(135deg, ${bg[0]}, ${bg[1]}, ${bg[2]})`;

export const TWEAK_DEFAULTS: Tweaks = {
  accent: "#a78bfa",
  radius: 18,
  blur: 22,
  opacity: 0.42,
};

/** localStorage key holding the last-applied CSS vars, so the inline boot script
 * in index.html can paint the right theme before React/network loads (no flash). */
export const CSS_CACHE_KEY = "nimbus-css-cache";

/** Apply a theme + tweaks to the document's CSS custom properties. */
export function applyTheme(themeIndex: number, tweaks: Tweaks): void {
  const root = document.documentElement.style;
  const th = THEMES[themeIndex] || THEMES[DEFAULT_THEME];
  const vars: Record<string, string> = {
    "--g1": th.bg[0],
    "--g2": th.bg[1],
    "--g3": th.bg[2],
    "--ink": th.ink || "#2a2433",
    "--muted": th.muted || "60,40,70",
    "--surf": th.surf || "255,255,255",
    "--accent": tweaks.accent,
    "--radius": tweaks.radius + "px",
    "--glass-blur": tweaks.blur + "px",
    "--glass-op": String(tweaks.opacity),
  };
  Object.entries(vars).forEach(([k, v]) => root.setProperty(k, v));
  document.documentElement.setAttribute("data-dark", th.dark ? "1" : "0");
  try {
    localStorage.setItem(CSS_CACHE_KEY, JSON.stringify({ ...vars, "data-dark": th.dark ? "1" : "0" }));
  } catch {
    /* ignore */
  }
}
