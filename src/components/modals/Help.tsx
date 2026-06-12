import type { ReactNode } from "react";
import { Overlay } from "@/components/common/Overlay";
import {
  IconChat,
  IconCheckSq,
  IconChevDown,
  IconClock,
  IconCopy,
  IconDownload,
  IconFlame,
  IconFlow,
  IconHelp,
  IconLink,
  IconNote,
  IconPlus,
  IconRepeat,
  IconSearch,
  IconSearchCmd,
  IconSpark,
  IconTag,
  IconTarget,
  IconTick,
  IconWand,
  IconChart,
  IconCalView,
} from "@/components/icons/Icons";

function Item({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="help-item">
      <span className="hi">{icon}</span>
      <div>
        <div className="ht">{title}</div>
        <div className="hd">{children}</div>
      </div>
    </div>
  );
}

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div className="help glass" onClick={(e) => e.stopPropagation()}>
        <div className="help-scroll">
          <div className="help-head">
            <div className="ttl"><IconHelp s={20} />How Nimbus works</div>
            <button className="d-close" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="help-intro">A quick tour of everything in the app. Your boards sync securely to your account — sign in anywhere and they're right where you left them.</div>

          <div className="help-sec">
            <div className="sh">The board</div>
            <Item icon={<IconFlow s={15} />} title="Custom columns">Tasks flow <b>To Do → In Progress → Done</b>, but you can add your own stages. Hit <b>+ Column</b>; hover a column to <b>‹ › reorder</b>, <b>✎ rename</b> (or double-click its title), or <b>delete</b> it (its tasks move to the first column). The three core columns can be reordered but not removed.</Item>
            <Item icon={<IconCheckSq s={15} />} title="Drag to reorder">Drag a card up or down — a glowing line shows where it'll drop. Order is manual and saved.</Item>
            <Item icon={<IconPlus />} title="Quick add">Hit <b>Add a task</b> in any column and type naturally: <kbd>Email Maya tomorrow #Work !high</kbd>. It auto-detects the <b>date</b>, <b>#category</b>, and <b>!priority</b>.</Item>
            <Item icon={<IconSearch />} title="Search & filter">Use the search box and the category chips to focus the board.</Item>
            <Item icon={<IconCalView s={15} />} title="Calendar view">Switch to <b>Calendar</b> to see tasks on a month grid by due date — today's highlighted, click a chip to open the card.</Item>
            <Item icon={<IconTarget s={14} />} title="Focus mode">The <b>◎ target button</b> opens a focused session: a <b>Pomodoro timer</b> (25/5, soft chime) plus today's must-dos. The timer <b>keeps running in the background</b> — a live pill appears in the top bar.</Item>
          </div>

          <div className="help-sec">
            <div className="sh">Inside a card</div>
            <Item icon={<IconNote />} title="Open & edit">Click any card to edit the title, add <b>details</b>, set <b>priority</b>, <b>due date</b>, and <b>category</b>.</Item>
            <Item icon={<IconCheckSq s={15} />} title="Checklist + AI breakdown">Add subtasks with a progress bar, or hit <b>✨ Break down with AI</b> to turn the task into 3–6 steps.</Item>
            <Item icon={<IconLink s={14} />} title="Dependencies">Under <b>Blocked by</b>, link tasks that must finish first. A card shows a red <b>Blocked</b> badge until they're done.</Item>
            <Item icon={<IconRepeat s={14} />} title="Recurring tasks">Set <b>Repeats</b> to Daily, Weekdays, or Weekly. When you finish it, a fresh copy appears for next time.</Item>
            <Item icon={<IconChat s={14} />} title="Comments">Discuss a task in its comment thread.</Item>
          </div>

          <div className="help-sec">
            <div className="sh">Smart automation</div>
            <Item icon={<IconSpark />} title="Ready-now unblocking">Finish a task and anything it was blocking <b>auto-unblocks, pops to the top</b> of its column, and pulses so you notice.</Item>
          </div>

          <div className="help-sec">
            <div className="sh">AI assistant <span style={{ fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>(bring your own API key — add it in Settings)</span></div>
            <Item icon={<IconSpark />} title="Add with AI">The <b>✨ button</b> opens a box — paste a brain-dump, email, or notes and AI extracts clean tasks for you to review and add.</Item>
            <Item icon={<IconSpark />} title="Card assists"><b>Improve</b> rewrites the title + adds acceptance criteria, <b>Suggest details</b> fills priority/category/estimate, and <b>Suggest blockers</b> proposes dependencies.</Item>
            <Item icon={<IconSearchCmd s={15} />} title="Natural-language commands">In <kbd>⌘K</kbd>, type a request like <kbd>move everything overdue to today and bump to high</kbd> and pick <b>Ask AI to do this</b>.</Item>
            <Item icon={<IconWand s={14} />} title="Brief: Daily & Review">The Brief has a <b>Daily</b> standup view (overdue, due today, what to start next) and a <b>Weekly Review</b> retro of shipped and slipped work.</Item>
            <Item icon={<IconTarget s={14} />} title="Focus coach">In Focus mode, see whether today's picks <b>fit a focused day</b>, and tap <b>“What's the first step?”</b> for a nudge.</Item>
          </div>

          <div className="help-sec">
            <div className="sh">Power tools</div>
            <Item icon={<IconSearchCmd s={15} />} title="Command palette">Press <kbd>⌘K</kbd> (or <kbd>Ctrl K</kbd>) anywhere to jump to a task, add one, switch views or themes, open the Brief, or export.</Item>
            <Item icon={<IconSpark />} title="Plan my day (AI)">From the palette, <b>Plan my day with AI</b> reorders your To Do list into the smartest sequence for today.</Item>
            <Item icon={<IconClock s={14} />} title="Time estimates">Give a card an estimate (30m–1d); it shows as a <b>~2h</b> badge on the board.</Item>
            <Item icon={<IconFlow s={14} />} title="WIP limit">Set a soft cap on In Progress in <b>Settings</b> — the column warns when you overload it.</Item>
            <Item icon={<IconFlame s={13} />} title="Celebration">Enjoy confetti each time you finish a task.</Item>
            <Item icon={<IconDownload s={14} />} title="Export">Copy the whole board as Markdown from Settings or the palette.</Item>
          </div>

          <div className="help-sec">
            <div className="sh">Insight & look</div>
            <Item icon={<IconChart s={15} />} title="Reports">The <b>Reports</b> tab shows velocity, average cycle time, on-time rate, work-in-progress, charts — and an <b>AI usage</b> panel tracking your AI actions, tokens, and estimated cost.</Item>
            <Item icon={<IconTag />} title="Categories">Hit <b>Manage</b> to rename, recolor, add, or remove lists — tasks update everywhere.</Item>
            <Item icon={<IconTick s={15} />} title="Themes">Use the theme switcher to change the whole look across seven palettes — including <b>Frozen</b> and a full <b>Midnight</b> dark mode. Your pick is saved.</Item>
            <Item icon={<IconSpark />} title="Appearance">In <b>Settings</b>, fine-tune the glass — Blur, Frost opacity, Roundness, and accent color. Saved automatically.</Item>
          </div>

          <div className="help-sec">
            <div className="sh">Boards & organization</div>
            <Item icon={<IconChevDown s={15} />} title="Multiple boards">Click the <b>board name</b> to switch boards, or <b>+ New board</b> for a fresh one — each keeps its own tasks, columns, and categories.</Item>
            <Item icon={<IconFlow s={15} />} title="Swimlanes">Use the <b>Lanes</b> toggle to group every column's cards into horizontal lanes — by <b>List</b> or <b>Priority</b>.</Item>
            <Item icon={<IconCopy />} title="Card templates">Hit the <b>⧉ template button</b> to start a card pre-filled with a structure and checklist.</Item>
          </div>

          <div className="help-sec">
            <div className="sh">Shortcuts & tips</div>
            <div className="kb-cheat">
              <div className="kb-line"><kbd>⌘K</kbd> <span>/ <kbd>Ctrl K</kbd> — open the command palette</span></div>
              <div className="kb-line"><kbd>Enter</kbd> <span>add the task you're typing (in quick-add or the palette)</span></div>
              <div className="kb-line"><kbd>Esc</kbd> <span>close any panel, card, or the palette</span></div>
              <div className="kb-line"><kbd>Double-click</kbd> <span>a custom column's title to rename it</span></div>
              <div className="kb-line"><kbd>Click</kbd> <span>a card's priority pill to cycle High → Med → Low</span></div>
              <div className="kb-line"><kbd>Drag</kbd> <span>a card between or within columns to move / reorder it</span></div>
            </div>
            <Item icon={<IconNote />} title="Everything syncs">Your board, columns, categories, theme, glass settings, and WIP limit are saved to your account.</Item>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
