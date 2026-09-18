import { useState } from "react";
import { X } from "lucide-react";
import { useCreateWorkItem } from "../../api/resources";
import type { WorkflowState } from "../../types";

export function CreateItemModal({
  projectId, states, defaultStateId, onClose,
}: { projectId: string; states: WorkflowState[]; defaultStateId?: string; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [stateId, setStateId] = useState(defaultStateId ?? states[0]?.id ?? "");
  const [itemType, setItemType] = useState("task");
  const createItem = useCreateWorkItem();

  function submit() {
    if (!title.trim()) return;
    createItem.mutate(
      { project: projectId, title, state: stateId, item_type: itemType as any },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">New work item</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Work item title"
          className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <div className="mb-4 grid grid-cols-2 gap-3">
          <select
            value={stateId}
            onChange={(e) => setStateId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {states.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {["task", "bug", "story", "epic"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button
          onClick={submit}
          disabled={createItem.isPending}
          className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Create work item
        </button>
      </div>
    </div>
  );
}
