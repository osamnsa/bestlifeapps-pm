import { useParams } from "react-router-dom";
import { useState } from "react";
import { useCycles, useBurndown, useCreateCycle } from "../api/resources";
import { BurndownChart } from "../components/cycles/BurndownChart";
import { Plus, X } from "lucide-react";
import { format } from "date-fns";

export function CyclesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: cycles } = useCycles(projectId);
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const activeCycleId = selectedCycleId ?? cycles?.find((c) => c.is_active)?.id ?? cycles?.[0]?.id;
  const { data: burndown } = useBurndown(activeCycleId);

  if (!projectId) return null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Cycles</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={14} /> New cycle
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-2">
          {cycles?.map((cycle) => (
            <button
              key={cycle.id}
              onClick={() => setSelectedCycleId(cycle.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                cycle.id === activeCycleId
                  ? "border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/50"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{cycle.name}</span>
                {cycle.is_active && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {format(new Date(cycle.start_date), "MMM d")} – {format(new Date(cycle.end_date), "MMM d")}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${cycle.total_items ? ((cycle.completed_items ?? 0) / cycle.total_items) * 100 : 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{cycle.completed_items ?? 0} / {cycle.total_items ?? 0} work items done</p>
            </button>
          ))}
          {(!cycles || cycles.length === 0) && <p className="text-sm text-slate-400 dark:text-slate-500">No cycles yet. Create your first one.</p>}
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Burndown chart</h2>
          {burndown ? (
            <>
              <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">{burndown.cycle} · {burndown.total_points} total points</p>
              <BurndownChart data={burndown} />
            </>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Select a cycle to see its burndown.</p>
          )}
        </div>
      </div>

      {showCreate && projectId && <CreateCycleModal projectId={projectId} onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateCycleModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const createCycle = useCreateCycle();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd"));

  function submit() {
    if (!name.trim()) return;
    createCycle.mutate(
      { project: projectId, name, start_date: startDate, end_date: endDate },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">New cycle</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <input
          autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Cycle name"
          className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Start date</label>
            <input
              type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">End date</label>
            <input
              type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
        <button onClick={submit} className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Create cycle
        </button>
      </div>
    </div>
  );
}
