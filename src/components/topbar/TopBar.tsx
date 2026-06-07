import type { Board, LaneBy } from "@/types";
import { useUI } from "@/state/uiStore";
import { mmss } from "@/lib/confetti";
import { Ring } from "@/components/common/Ring";
import { BoardSwitcher } from "./BoardSwitcher";
import { ThemePicker } from "./ThemePicker";
import {
  IconCalView,
  IconChart,
  IconCopy,
  IconFlame,
  IconFlow,
  IconGear,
  IconHelp,
  IconPause,
  IconPlay,
  IconRows,
  IconSearch,
  IconSearchCmd,
  IconSpark,
  IconTarget,
  IconWand,
  IconChatFill,
} from "@/components/icons/Icons";

interface Props {
  pct: number;
  openCount: number;
  doneCount: number;
  streak: number;
  boards: Board[];
  activeBoardId: string | null;
  onSwitchBoard: (id: string) => void;
  onAddBoard: () => void;
  onRenameBoard: (id: string, name: string) => void;
  onDeleteBoard: (id: string) => void;
  theme: number;
  onSelectTheme: (i: number) => void;
  laneBy: LaneBy;
  onLaneBy: (l: LaneBy) => void;
  pointsCount: number;
}

export function TopBar(props: Props) {
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const openModal = useUI((s) => s.openModal);
  const query = useUI((s) => s.query);
  const setQuery = useUI((s) => s.setQuery);
  const compact = useUI((s) => s.compact);
  const toggleCompact = useUI((s) => s.toggleCompact);

  const pomoRun = useUI((s) => s.pomoRun);
  const pomoSecs = useUI((s) => s.pomoSecs);
  const pomoMode = useUI((s) => s.pomoMode);
  const pomoActive = pomoRun || pomoSecs !== 25 * 60 || pomoMode !== "work";

  const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" });

  return (
    <div className="topbar glass">
      <div className="tb-row">
        <div className="brand">
          <Ring pct={props.pct} />
          <div>
            <div className="eyebrow">Nimbus · {weekday}</div>
            <BoardSwitcher
              boards={props.boards}
              activeId={props.activeBoardId}
              onSwitch={props.onSwitchBoard}
              onAdd={props.onAddBoard}
              onRename={props.onRenameBoard}
              onDelete={props.onDeleteBoard}
            />
            <div className="sub">
              {props.openCount} open · {props.doneCount} done
              {props.streak > 0 && (
                <span className="streak">
                  <IconFlame />
                  {props.streak}-day streak
                </span>
              )}
            </div>
          </div>
        </div>

        <span className="tb-spring"></span>

        <button className="tp-trigger" onClick={() => openModal("talkingPoints")} title="Open talking points">
          <IconChatFill s={15} />
          Talking points
          {props.pointsCount > 0 && <span className="pill">{props.pointsCount}</span>}
        </button>
        <button className="brief-btn" onClick={() => openModal("brief")}>
          <IconWand />
          Brief
        </button>
        {pomoActive && (
          <button
            className={"pomo-pill" + (pomoMode === "break" ? " brk" : "")}
            onClick={() => openModal("focus")}
            title="Focus timer"
          >
            {pomoRun ? <IconPause s={12} /> : <IconPlay s={12} />}
            {mmss(pomoSecs)}
          </button>
        )}
        <div className="tb-icons">
          <button className="help-btn" onClick={() => openModal("addWithAI")} title="Add with AI" aria-label="Add with AI"><IconSpark /></button>
          <button className="help-btn" onClick={() => openModal("templates")} title="New from template" aria-label="New from template"><IconCopy /></button>
          <button className="help-btn" onClick={() => openModal("focus")} title="Focus mode" aria-label="Focus"><IconTarget s={16} /></button>
          <button className="help-btn" onClick={() => openModal("palette")} title="Command palette (⌘K)" aria-label="Command palette"><IconSearchCmd s={16} /></button>
          <button className="help-btn" onClick={() => openModal("help")} title="How Nimbus works" aria-label="Help"><IconHelp /></button>
          <button className="help-btn" onClick={() => openModal("settings")} title="Settings" aria-label="Settings"><IconGear /></button>
        </div>
      </div>

      <div className="tb-row tb-row-2">
        <div className="viewseg">
          <button className={view === "board" ? "on" : ""} onClick={() => setView("board")}><IconFlow s={13} />Board</button>
          <button className={view === "calendar" ? "on" : ""} onClick={() => setView("calendar")}><IconCalView s={13} />Calendar</button>
          <button className={view === "reports" ? "on" : ""} onClick={() => setView("reports")}><IconChart s={13} />Reports</button>
        </div>

        {view === "board" && (
          <div className="laneseg" title="Group cards into swimlanes">
            <span className="laneseg-lbl">Lanes</span>
            <button className={props.laneBy === "none" ? "on" : ""} onClick={() => props.onLaneBy("none")}>Off</button>
            <button className={props.laneBy === "category" ? "on" : ""} onClick={() => props.onLaneBy("category")}>List</button>
            <button className={props.laneBy === "priority" ? "on" : ""} onClick={() => props.onLaneBy("priority")}>Priority</button>
          </div>
        )}

        {view === "board" && (
          <button
            className={"compact-toggle" + (compact ? " on" : "")}
            onClick={toggleCompact}
            title="Compact cards — title only (press C)"
            aria-pressed={compact}
          >
            <IconRows s={14} />
            Compact
          </button>
        )}

        <span className="tb-spring"></span>

        {view === "board" && (
          <div className="search">
            <span className="icon"><IconSearch /></span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks…" />
          </div>
        )}

        <ThemePicker value={props.theme} onChange={props.onSelectTheme} />
      </div>
    </div>
  );
}
