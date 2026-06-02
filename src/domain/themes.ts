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

/** Apply a theme + tweaks to the document's CSS custom properties. */
export function applyTheme(themeIndex: number, tweaks: Tweaks): void {
  const root = document.documentElement.style;
  const th = THEMES[themeIndex] || THEMES[DEFAULT_THEME];
  root.setProperty("--g1", th.bg[0]);
  root.setProperty("--g2", th.bg[1]);
  root.setProperty("--g3", th.bg[2]);
  root.setProperty("--ink", th.ink || "#2a2433");
  root.setProperty("--muted", th.muted || "60,40,70");
  root.setProperty("--surf", th.surf || "255,255,255");
  document.documentElement.setAttribute("data-dark", th.dark ? "1" : "0");
  root.setProperty("--accent", tweaks.accent);
  root.setProperty("--radius", tweaks.radius + "px");
  root.setProperty("--glass-blur", tweaks.blur + "px");
  root.setProperty("--glass-op", String(tweaks.opacity));
}
