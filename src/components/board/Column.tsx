import { Fragment, useEffect, useRef, useState } from "react";
import type { Category, Column as ColumnT, LaneBy, Priority, Task } from "@/types";
import { lanesFor } from "@/domain/board";
import { Card } from "./Card";
import { QuickAdd } from "./QuickAdd";
import { IconChevL, IconChevR, IconFlame, IconPencil, IconTrash } from "@/components/icons/Icons";

interface Props {
  col: ColumnT;
  tasks: Task[];
  allTasks: Task[];
  cats: Category[];
  dragId: string | null;
  over: boolean;
  flash: string[];
  wipLimit: number;
  colIndex: number;
  colCount: number;
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

export function Column(props: Props) {
  const { col, tasks, allTasks, cats, dragId, over, flash, wipLimit, colIndex, colCount, laneBy } = props;
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const core = !!col.core;

  useEffect(() => {
    if (renaming && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [renaming]);

  const wipOver = col.key === "doing" && !!wipLimit && tasks.length > wipLimit;

  return (
    <div
      className={"column glass" + (over ? " over" : "")}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        props.onReorder(col.key, dropIdx == null ? tasks.length : dropIdx);
        setDropIdx(null);
      }}
      onDragEnter={() => props.onDragEnterCol(col.key)}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          props.onDragLeaveCol(col.key);
          setDropIdx(null);
        }
      }}
    >
      <div className="col-head" style={{ "--col-accent": col.dot } as React.CSSProperties}>
        {renaming ? (
          <input
            ref={nameRef}
            className="col-name-edit"
            defaultValue={col.name}
            maxLength={22}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v) props.onRenameCol(col.key, v);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <span className="name" onDoubleClick={() => !core && setRenaming(true)} title={core ? col.name : "Double-click to rename"}>
            {col.name}
          </span>
        )}
        <span className={"num" + (wipOver ? " wipover" : "")}>
          {col.key === "doing" && wipLimit ? tasks.length + "/" + wipLimit : tasks.length}
        </span>
        <span className="col-tools">
          <button onClick={() => props.onMoveCol(col.key, -1)} disabled={colIndex === 0} title="Move left" aria-label="Move left"><IconChevL s={14} /></button>
          <button onClick={() => props.onMoveCol(col.key, 1)} disabled={colIndex === colCount - 1} title="Move right" aria-label="Move right"><IconChevR s={14} /></button>
          {!core && <button onClick={() => setRenaming(true)} title="Rename" aria-label="Rename"><IconPencil s={13} /></button>}
          {!core && (
            <button
              onClick={() => {
                if (tasks.length === 0 || confirm('Delete "' + col.name + '"? Its tasks move to the first column.')) props.onDeleteCol(col.key);
              }}
              title="Delete column"
              aria-label="Delete column"
            >
              <IconTrash />
            </button>
          )}
        </span>
      </div>
      {wipOver && (
        <div className="wip-note">
          <IconFlame s={11} />
          Over your WIP limit — finish before starting more
        </div>
      )}

      <div
        className="col-list"
        onDragOver={(e) => {
          e.preventDefault();
          if (laneBy === "none") setDropIdx(tasks.length);
        }}
      >
        {tasks.length === 0 ? (
          <div className="col-empty">
            <span>Drop tasks here</span>
          </div>
        ) : laneBy === "none" ? (
          <Fragment>
            {tasks.map((t, i) => (
              <Fragment key={t.id}>
                {dragId != null && dropIdx === i && <div className="drop-line"></div>}
                <Card
                  t={t}
                  allTasks={allTasks}
                  dragging={dragId === t.id}
                  flash={flash.includes(t.id)}
                  onItemDragOver={(after) => setDropIdx(after ? i + 1 : i)}
                  onDragStart={props.onDragStart}
                  onDragEnd={() => {
                    props.onDragEnd();
                    setDropIdx(null);
                  }}
                  onDelete={props.onDelete}
                  onCyclePri={props.onCyclePri}
                  onOpen={props.onOpen}
                />
              </Fragment>
            ))}
            {dragId != null && dropIdx === tasks.length && tasks.length > 0 && <div className="drop-line"></div>}
          </Fragment>
        ) : (
          lanesFor(laneBy, tasks, cats).map((lane) =>
            lane.items.length === 0 ? null : (
              <div className="lane" key={lane.key}>
                <div className="lane-head">
                  <span className="lane-dot" style={{ background: lane.color }}></span>
                  {lane.name}
                  <span className="lane-n">{lane.items.length}</span>
                </div>
                {lane.items.map((t) => (
                  <Card
                    key={t.id}
                    t={t}
                    allTasks={allTasks}
                    dragging={dragId === t.id}
                    flash={flash.includes(t.id)}
                    onItemDragOver={() => {}}
                    onDragStart={props.onDragStart}
                    onDragEnd={() => {
                      props.onDragEnd();
                      setDropIdx(null);
                    }}
                    onDelete={props.onDelete}
                    onCyclePri={props.onCyclePri}
                    onOpen={props.onOpen}
                  />
                ))}
              </div>
            ),
          )
        )}
      </div>

      <QuickAdd colKey={col.key} cats={cats} onAdd={props.onAdd} />
    </div>
  );
}
