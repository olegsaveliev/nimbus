import { useState } from "react";
import type { Task } from "@/types";
import { iso, startOfToday, todayIso } from "@/domain/dates";
import { priColor } from "@/domain/priority";
import { IconChevL, IconChevR } from "@/components/icons/Icons";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  const today = startOfToday();
  const ti = todayIso();
  const [base, setBase] = useState(() => {
    const d = new Date(today);
    d.setDate(1);
    return d;
  });
  const year = base.getFullYear();
  const month = base.getMonth();
  const startDow = new Date(year, month, 1).getDay();
  const daysIn = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ d: Date; out: boolean }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ d: new Date(year, month, 1 - (startDow - i)), out: true });
  for (let day = 1; day <= daysIn; day++) cells.push({ d: new Date(year, month, day), out: false });
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].d;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    cells.push({ d, out: true });
  }

  const byDay: Record<string, Task[]> = {};
  tasks.forEach((t) => {
    if (t.due) (byDay[t.due] = byDay[t.due] || []).push(t);
  });

  return (
    <div className="cal">
      <div className="cal-head">
        <span className="mname">{base.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        <span className="cal-nav">
          <button
            className="cal-today-btn"
            onClick={() => {
              const d = new Date(today);
              d.setDate(1);
              setBase(d);
            }}
          >
            Today
          </button>
          <button onClick={() => setBase(new Date(year, month - 1, 1))} aria-label="Previous month"><IconChevL /></button>
          <button onClick={() => setBase(new Date(year, month + 1, 1))} aria-label="Next month"><IconChevR /></button>
        </span>
      </div>
      <div className="cal-wds">
        {WD.map((w) => (
          <div className="cal-wd" key={w}>
            {w}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map(({ d, out }, i) => {
          const ds = iso(d);
          const isToday = ds === ti;
          const items = byDay[ds] || [];
          return (
            <div className={"cal-cell" + (out ? " out" : "") + (isToday ? " today" : "")} key={i}>
              <span className="cal-dn">{d.getDate()}</span>
              {items.slice(0, 3).map((t) => (
                <span className={"cal-chip" + (t.status === "done" ? " done" : "")} key={t.id} onClick={() => onOpen(t.id)} title={t.text}>
                  <i style={{ background: priColor(t.pri) }}></i>
                  {t.text}
                </span>
              ))}
              {items.length > 3 && <span className="cal-more">+{items.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
