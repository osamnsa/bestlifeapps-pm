import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useWorkItems, useStates, useLabels } from "../api/resources";
import { KanbanBoard } from "../components/board/KanbanBoard";
import { ListView } from "../components/board/ListView";
import { FilterBar, type BoardFilters } from "../components/board/FilterBar";
import { WorkItemPanel } from "../components/board/WorkItemPanel";
import { CreateItemModal } from "../components/board/CreateItemModal";
import type { WorkItem } from "../types";

export function BoardPage({ layout = "kanban" }: { layout?: "kanban" | "list" }) {
  const { projectId } = useParams<{ projectId: string }>();
  const [filters, setFilters] = useState<BoardFilters>({ search: "", priority: "", labels: "", state_group: "" });
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [creatingForState, setCreatingForState] = useState<string | null>(null);

  const apiFilters = useMemo(() => {
    const f: Record<string, any> = {};
    if (filters.search) f.search = filters.search;
    if (filters.priority) f.priority = filters.priority;
    if (filters.labels) f.labels = filters.labels;
    return f;
  }, [filters]);

  const { data: items } = useWorkItems(projectId, apiFilters);
  const { data: states } = useStates(projectId);
  const { data: labels } = useLabels(projectId);

  if (!projectId) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{layout === "kanban" ? "Board" : "List"}</h1>
        <button
          onClick={() => setCreatingForState(states?.[0]?.id ?? null)}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New work item
        </button>
      </div>
      <FilterBar filters={filters} onChange={setFilters} labels={labels ?? []} states={states} />
      <div className="flex-1 overflow-hidden">
        {layout === "kanban" ? (
          <KanbanBoard
            states={states ?? []}
            items={items ?? []}
            onSelectItem={setSelectedItem}
            onCreateItem={(stateId) => setCreatingForState(stateId)}
          />
        ) : (
          <ListView items={items ?? []} onSelectItem={setSelectedItem} />
        )}
      </div>

      {selectedItem && (
        <WorkItemPanel itemId={selectedItem.id} projectId={projectId} onClose={() => setSelectedItem(null)} />
      )}
      {creatingForState && states && (
        <CreateItemModal
          projectId={projectId}
          states={states}
          defaultStateId={creatingForState}
          onClose={() => setCreatingForState(null)}
        />
      )}
    </div>
  );
}
