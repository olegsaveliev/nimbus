import { IconPlus, IconTag } from "@/components/icons/Icons";

interface Props {
  catNames: string[];
  counts: Record<string, number>;
  filter: string;
  onFilter: (c: string) => void;
  onManage: () => void;
  onAddTask: () => void;
  onAddColumn: () => void;
}

export function FilterBar({ catNames, counts, filter, onFilter, onManage, onAddTask, onAddColumn }: Props) {
  return (
    <div className="filterbar">
      {["All", ...catNames].map((c) => (
        <button key={c} className={"chip" + (filter === c ? " active" : "")} onClick={() => onFilter(c)}>
          {c}
          {counts[c] > 0 && <span className="count">{counts[c]}</span>}
        </button>
      ))}
      <button className="cat-edit" onClick={onManage}>
        <IconTag />
        Manage
      </button>
      <span className="fb-spring"></span>
      <button className="add-col-sm add-task-sm" onClick={onAddTask} title="Add a task" aria-label="Add a task">
        <IconPlus />
        Task
      </button>
      <button className="add-col-sm" onClick={onAddColumn} title="Add a column" aria-label="Add a column">
        <IconPlus />
        Column
      </button>
    </div>
  );
}
