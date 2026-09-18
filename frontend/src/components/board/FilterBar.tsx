import { Search } from "lucide-react";
import type { Label, WorkflowState } from "../../types";

export interface BoardFilters {
  search: string;
  priority: string;
  labels: string;
  state_group: string;
}

export function FilterBar({
  filters, onChange, labels,
}: { filters: BoardFilters; onChange: (f: BoardFilters) => void; labels: Label[]; states?: WorkflowState[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 dark:border-slate-700">
        <Search size={14} className="text-slate-400" />
        <input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search work items..."
          className="w-48 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200"
        />
      </div>
      <select
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value })}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <option value="">All priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="none">None</option>
      </select>
      <select
        value={filters.labels}
        onChange={(e) => onChange({ ...filters, labels: e.target.value })}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <option value="">All labels</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      {(filters.search || filters.priority || filters.labels) && (
        <button
          onClick={() => onChange({ search: "", priority: "", labels: "", state_group: "" })}
          className="text-sm text-brand-600 hover:underline dark:text-brand-400"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
