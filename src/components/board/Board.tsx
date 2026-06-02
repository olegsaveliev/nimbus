import type { Category, Column as ColumnT, LaneBy, Priority, Task } from "@/types";
import { Column } from "./Column";

interface Props {
  columns: ColumnT[];
  byCol: Record<string, Task[]>;
  allTasks: Task[];
  cats: Category[];
  dragId: string | null;
  overCol: string | null;
  flash: string[];
  wipLimit: number;
  laneBy: LaneBy;
  onMoveCol: (key: string, dir: number) => void;
  onRenameCol: (key: string, name: string) => void;
  onDeleteCol: (key: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onReorder: (colKey: string, idx: number) => void;
  onDragEnterCol: (key: string) => void;
  onDragLeaveCol: (key: string) => void;
  onAdd: (status: string, text: string, pri: Priority | null, cat: string | null, due: string | null) => void;
  onDelete: (id: string) => void;
  onCyclePri: (id: string) => void;
  onOpen: (id: string) => void;
}

export function Board(props: Props) {
  return (
    <div
      className="board"
      style={{ gridTemplateColumns: "repeat(" + props.columns.length + ", minmax(244px, 1fr))" }}
    >
      {props.columns.map((col, ci) => (
        <Column
          key={col.key}
          col={col}
          tasks={props.byCol[col.key] || []}
          allTasks={props.allTasks}
          cats={props.cats}
          wipLimit={props.wipLimit}
          dragId={props.dragId}
          over={props.overCol === col.key}
          flash={props.flash}
          colIndex={ci}
          colCount={props.columns.length}
          laneBy={props.laneBy}
          onMoveCol={props.onMoveCol}
          onRenameCol={props.onRenameCol}
          onDeleteCol={props.onDeleteCol}
          onDragStart={props.onDragStart}
          onDragEnd={props.onDragEnd}
          onReorder={props.onReorder}
          onDragEnterCol={props.onDragEnterCol}
          onDragLeaveCol={props.onDragLeaveCol}
          onAdd={props.onAdd}
          onDelete={props.onDelete}
          onCyclePri={props.onCyclePri}
          onOpen={props.onOpen}
        />
      ))}
    </div>
  );
}
