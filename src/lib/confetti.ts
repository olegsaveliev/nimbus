/* Confetti burst on completion — ported from app.jsx. */
export function fireConfetti(x: number, y: number): void {
  const colors = ["#7c5cff", "#ff6b9d", "#22d3ee", "#34d399", "#fb923c", "#f0506e"];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div");
    p.className = "confetti-bit";
    p.style.background = colors[i % colors.length];
    p.style.left = x + "px";
    p.style.top = y + "px";
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 70 + Math.random() * 110;
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", Math.sin(ang) * dist + Math.random() * 40 + "px");
    p.style.setProperty("--rot", Math.random() * 540 - 270 + "deg");
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1050);
  }
}

export function celebrate(): void {
  try {
    fireConfetti(window.innerWidth / 2, window.innerHeight * 0.4);
  } catch {
    /* ignore */
  }
}

/* Pomodoro chime — ported from app.jsx. */
export function chime(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const a = new Ctx();
    const o = a.createOscillator();
    const g = a.createGain();
    o.connect(g);
    g.connect(a.destination);
    o.frequency.value = 880;
    g.gain.value = 0.07;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.7);
    o.stop(a.currentTime + 0.7);
  } catch {
    /* ignore */
  }
}

export function mmss(s: number): string {
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}
