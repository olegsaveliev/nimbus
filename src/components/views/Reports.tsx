import { Fragment } from "react";
import type { Category, Task } from "@/types";
import { DAY, iso, startOfToday, WEEKDAY } from "@/domain/dates";
import { computeReports } from "@/domain/reports";
import { useAIUsage } from "@/data/aiUsage";
import { AI_PRICING, aiCost } from "@/services/ai";
import { IconBolt, IconClock, IconDown, IconFlow, IconSpark, IconTarget, IconUp } from "@/components/icons/Icons";

function Delta({ value, unit, good, suffix }: { value: number; unit: string; good: boolean; suffix: string }) {
  const cls = value === 0 ? "flat" : good ? "good" : "bad";
  const Arrow = value === 0 ? null : value > 0 ? IconUp : IconDown;
  const mag = Math.abs(value);
  return (
    <span className={"delta " + cls}>
      {Arrow && <Arrow />}
      {mag}
      {unit} {suffix}
    </span>
  );
}

export function Reports({ tasks, cats, wip }: { tasks: Task[]; cats: Category[]; wip: number }) {
  const m = computeReports(tasks, cats);
  const today = startOfToday();
  const maxDay = Math.max(1, ...m.perDay.map((p) => p.n));
  const maxCat = Math.max(1, ...m.byCat.map((c) => c.n));

  const insight =
    m.velDelta > 0 ? (
      <span>
        <b>You're on a roll.</b> {m.velocity} tasks closed this week — {m.velDelta}% more than last, and you're finishing them{" "}
        {Math.abs(m.cycleDelta)}d {m.cycleDelta <= 0 ? "faster" : "slower"}.
      </span>
    ) : (
      <span>
        <b>Steady week.</b> {m.velocity} tasks closed, averaging {m.cycle}d from start to done. {m.onTime}% landed on time.
      </span>
    );

  const { data: usage } = useAIUsage();
  const u = usage ?? { total: 0, prov: {}, days: {}, tokIn: {}, tokOut: {} };
  const usageDays = Object.keys(u.days || {});
  const usageWeek = usageDays
    .filter((d) => (today.getTime() - new Date(d + "T00:00:00").getTime()) / DAY < 7)
    .reduce((a, d) => a + u.days[d], 0);
  const provLabels: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI", builtin: "Built-in" };
  const provColors: Record<string, string> = { anthropic: "#d97757", openai: "#10a37f", builtin: "var(--accent)" };
  const provEntries = Object.entries(u.prov || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const maxProv = Math.max(1, ...provEntries.map((e) => e[1]));
  const totalTokens = Object.keys(AI_PRICING).reduce((a, p) => a + ((u.tokIn || {})[p] || 0) + ((u.tokOut || {})[p] || 0), 0);
  const totalCost = aiCost(u);
  const provTok = (p: string) => ((u.tokIn || {})[p] || 0) + ((u.tokOut || {})[p] || 0);
  const provCost = (p: string) => {
    const pr = AI_PRICING[p] || { in: 0, out: 0 };
    return ((u.tokIn || {})[p] || 0) / 1e6 * pr.in + ((u.tokOut || {})[p] || 0) / 1e6 * pr.out;
  };
  const fmtTok = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));
  const fmtCost = (c: number) => (c === 0 ? "$0.00" : c < 0.01 ? "<$0.01" : "$" + c.toFixed(2));

  const aiPerDay = (() => {
    const days: Array<{ d: number; n: number; wd: string }> = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today.getTime() - d * DAY);
      days.push({ d, n: (u.days || {})[iso(date)] || 0, wd: WEEKDAY[date.getDay()] });
    }
    return days;
  })();
  const aiMax = Math.max(1, ...aiPerDay.map((x) => x.n));

  return (
    <div className="reports">
      <div className="insight">
        <IconSpark />
        {insight}
      </div>

      <div className="metric-grid">
        <div className="metric glass">
          <div className="label"><IconBolt /> Velocity</div>
          <div className="val">{m.velocity}<small>/wk</small></div>
          <Delta value={m.velDelta} unit="%" good={m.velDelta >= 0} suffix="vs last week" />
        </div>
        <div className="metric glass">
          <div className="label"><IconClock /> Avg cycle time</div>
          <div className="val">{m.cycle}<small>days</small></div>
          <Delta value={m.cycleDelta} unit="d" good={m.cycleDelta <= 0} suffix={m.cycleDelta <= 0 ? "faster" : "slower"} />
        </div>
        <div className="metric glass">
          <div className="label"><IconTarget /> On-time rate</div>
          <div className="val">{m.onTime}<small>%</small></div>
          <Delta value={m.onTimeDelta} unit="pts" good={m.onTimeDelta >= 0} suffix="vs last week" />
        </div>
        <div className="metric glass">
          <div className="label"><IconFlow /> In progress</div>
          <div className="val">{wip}<small>active</small></div>
          <span className={"delta " + (wip <= 3 ? "good" : "bad")}>{wip <= 3 ? "Healthy focus" : "Spread thin"}</span>
        </div>
      </div>

      <div className="charts">
        <div className="chart-card glass">
          <div className="ct">Completed per day</div>
          <div className="csub">Last 7 days · {m.perDayTotal} done</div>
          <div className="bars">
            {m.perDay.map((p, i) => (
              <div className={"bcol" + (p.d === 0 ? " today" : "")} key={i}>
                <span className="bn">{p.n}</span>
                <div className="bar" style={{ height: (p.n / maxDay) * 100 + "%" }}></div>
                <span className="bx">{p.d === 0 ? "Today" : p.wd}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card glass">
          <div className="ct">By list</div>
          <div className="csub">Completed · last 14 days</div>
          <div className="catbars">
            {m.byCat.map((c, i) => (
              <div className="catbar" key={i}>
                <span className="cl"><span className="cdot" style={{ background: c.color }}></span>{c.name}</span>
                <span className="track"><span className="fill" style={{ width: (c.n / maxCat) * 100 + "%", background: c.color }}></span></span>
                <span className="cn">{c.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="charts">
        <div className="chart-card glass ai-usage">
          <div className="ct"><IconSpark /> AI usage</div>
          <div className="csub">AI actions you've run · {usageWeek} this week</div>
          {(u.total || 0) === 0 ? (
            <div className="ai-usage-empty">
              No AI actions yet. Try <b>Add with AI</b>, a card's <b>Improve</b>, or the <b>Brief</b>.
            </div>
          ) : (
            <Fragment>
              <div className="ai-usage-stats">
                <div className="aus"><b>{u.total}</b><span>actions</span></div>
                <div className="aus"><b>{fmtTok(totalTokens)}</b><span>tokens</span></div>
                <div className="aus"><b>{fmtCost(totalCost)}</b><span>est. cost</span></div>
              </div>
              <div className="catbars">
                {provEntries.map(([k, v]) => (
                  <div className="catbar" key={k}>
                    <span className="cl"><span className="cdot" style={{ background: provColors[k] || "var(--accent)" }}></span>{provLabels[k] || k}</span>
                    <span className="track"><span className="fill" style={{ width: (v / maxProv) * 100 + "%", background: provColors[k] || "var(--accent)" }}></span></span>
                    <span className="cn">{fmtTok(provTok(k))} · {fmtCost(provCost(k))}</span>
                  </div>
                ))}
              </div>
              <div className="ai-usage-note">
                Cost is an estimate from public per-token prices ({AI_PRICING.anthropic.model} ${AI_PRICING.anthropic.in}/${AI_PRICING.anthropic.out} per M in/out).
              </div>
            </Fragment>
          )}
        </div>
        <div className="chart-card glass">
          <div className="ct">AI actions per day</div>
          <div className="csub">Last 7 days</div>
          <div className="bars">
            {aiPerDay.map((p, i) => (
              <div className={"bcol" + (p.d === 0 ? " today" : "")} key={i}>
                <span className="bn">{p.n}</span>
                <div className="bar" style={{ height: (p.n / aiMax) * 100 + "%" }}></div>
                <span className="bx">{p.d === 0 ? "Today" : p.wd}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
