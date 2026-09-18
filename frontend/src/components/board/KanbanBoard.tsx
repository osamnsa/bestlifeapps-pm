import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { WorkItem, WorkflowState } from "../../types";
import { useUpdateWorkItem } from "../../api/resources";
import { PriorityBadge, TypeBadge, LabelChip, Avatar } from "../Badges";

interface KanbanBoardProps {
  states: WorkflowState[];
  items: WorkItem[];
  onSelectItem: (item: WorkItem) => void;
  onCreateItem: (stateId: string) => void;
}

export function KanbanBoard({ states, items, onSelectItem, onCreateItem }: KanbanBoardProps) {
  const updateItem = useUpdateWorkItem();
  const [activeItem, setActiveItem] = useState<WorkItem | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const itemsByState = useMemo(() => {
    const map: Record<string, WorkItem[]> = {};
    for (const s of states) map[s.id] = [];
    for (const item of items) {
      if (map[item.state]) map[item.state].push(item);
    }
    return map;
  }, [states, items]);

  function handleDragStart(e: DragStartEvent) {
    const item = items.find((i) => i.id === e.active.id);
    setActiveItem(item ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = e;
    if (!over) return;
    const item = items.find((i) => i.id === active.id);
    if (!item) return;
    const targetStateId = String(over.id).startsWith("column-")
      ? String(over.id).replace("column-", "")
      : items.find((i) => i.id === over.id)?.state;
    if (targetStateId && targetStateId !== item.state) {
      updateItem.mutate({ id: item.id, payload: { state: targetStateId } });
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {states.map((state) => (
          <Column
            key={state.id}
            state={state}
            items={itemsByState[state.id] ?? []}
            onSelectItem={onSelectItem}
            onCreateItem={onCreateItem}
          />
        ))}
      </div>
      <DragOverlay>{activeItem && <ItemCard item={activeItem} onClick={() => {}} dragging />}</DragOverlay>
    </DndContext>
  );
}

function Column({
  state, items, onSelectItem, onCreateItem,
}: { state: WorkflowState; items: WorkItem[]; onSelectItem: (i: WorkItem) => void; onCreateItem: (stateId: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${state.id}` });
  const points = items.reduce((sum, i) => sum + (i.story_points || 0), 0);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70 dark:bg-slate-900/70">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: state.color }} />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{state.name}</span>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            {items.length}
          </span>
        </div>
        <button onClick={() => onCreateItem(state.id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <Plus size={15} />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 overflow-y-auto px-2 pb-3 ${isOver ? "bg-brand-50/60 dark:bg-brand-950/40" : ""}`}
        style={{ minHeight: 80 }}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItemCard key={item.id} item={item} onClick={() => onSelectItem(item)} />
          ))}
        </SortableContext>
      </div>
      <div className="px-3 pb-2 text-[11px] text-slate-400 dark:text-slate-500">{points} pts</div>
    </div>
  );
}

function SortableItemCard({ item, onClick }: { item: WorkItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ItemCard item={item} onClick={onClick} />
    </div>
  );
}

function ItemCard({ item, onClick, dragging }: { item: WorkItem; onClick: () => void; dragging?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-brand-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-600 ${
        dragging ? "rotate-2 shadow-lg" : ""
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{item.identifier}</span>
        <TypeBadge type={item.item_type} />
      </div>
      <p className="mb-2 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">{item.title}</p>
      {item.labels?.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {item.labels.map((l) => (
            <LabelChip key={l.id} name={l.name} color={l.color} />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <PriorityBadge priority={item.priority} />
        <div className="flex items-center gap-1.5">
          {item.story_points > 0 && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
              {item.story_points}
            </span>
          )}
          {item.assignees?.[0] && <Avatar user={item.assignees[0]} size={20} />}
        </div>
      </div>
    </div>
  );
}
