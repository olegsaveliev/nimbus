/* Progress ring — ported from app.jsx. */
export function Ring({ pct }: { pct: number }) {
  const r = 23;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring-wrap">
      <svg width="58" height="58">
        <circle className="ring-bg" cx="29" cy="29" r={r} fill="none" strokeWidth="6" />
        <circle
          className="ring-fg"
          cx="29"
          cy="29"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <div className="ring-label">
        <b>{pct}%</b>
        <span>done</span>
      </div>
    </div>
  );
}
