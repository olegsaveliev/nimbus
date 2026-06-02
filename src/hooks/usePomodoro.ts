/* Drives the background Pomodoro timer living in the UI store: ticks every
 * second while running and chimes + advances when the clock hits 0. Mounted once
 * (in App) so the timer keeps running regardless of the Focus modal. */
import { useEffect } from "react";
import { useUI } from "@/state/uiStore";
import { chime } from "@/lib/confetti";

export function usePomodoro() {
  const pomoRun = useUI((s) => s.pomoRun);
  const pomoSecs = useUI((s) => s.pomoSecs);
  const setPomoSecs = useUI((s) => s.setPomoSecs);
  const advancePomo = useUI((s) => s.advancePomo);

  useEffect(() => {
    if (!pomoRun) return;
    const id = setInterval(() => setPomoSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [pomoRun, setPomoSecs]);

  useEffect(() => {
    if (pomoSecs !== 0) return;
    chime();
    advancePomo();
  }, [pomoSecs, advancePomo]);
}
