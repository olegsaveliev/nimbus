/* Export board as Markdown — ported from app.jsx (columns passed in, not a global). */
import type { Column, Task } from "@/types";
import { fmtDue } from "./dates";
import { fmtEst } from "./estimate";

export function boardMarkdown(tasks: Task[], columns: Column[]): string {
  let out = "# Nimbus board\n\n";
  columns.forEach((c) => {
    const items = tasks.filter((t) => t.status === c.key);
    out += `## ${c.name} (${items.length})\n\n`;
    items.forEach((t) => {
      const box = t.status === "done" ? "[x]" : "[ ]";
      const bits = [t.pri.toUpperCase()];
      if (t.due) bits.push(fmtDue(t.due)?.label || t.due);
      if (t.est) bits.push("~" + fmtEst(t.est));
      if (t.cat) bits.push(t.cat);
      out += `- ${box} ${t.text}  _(${bits.join(" · ")})_\n`;
      (t.subtasks || []).forEach((s) => (out += `  - [${s.done ? "x" : " "}] ${s.text}\n`));
    });
    out += "\n";
  });
  return out.trim();
}
