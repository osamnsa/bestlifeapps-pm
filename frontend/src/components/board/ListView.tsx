import type { WorkItem } from "../../types";
import { PriorityBadge, TypeBadge, LabelChip, Avatar } from "../Badges";

export function ListView({ items, onSelectItem }: { items: WorkItem[]; onSelectItem: (i: WorkItem) => void }) {
  return (
    <div className="overflow-auto p-4">
      <table className="w-full border-separate border-spacing-y-1.5 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <th className="px-3 pb-2">ID</th>
            <th className="px-3 pb-2">Title</th>
            <th className="px-3 pb-2">Type</th>
            <th className="px-3 pb-2">Priority</th>
            <th className="px-3 pb-2">Labels</th>
            <th className="px-3 pb-2">Points</th>
            <th className="px-3 pb-2">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="cursor-pointer rounded-lg bg-white shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <td className="rounded-l-lg px-3 py-2.5 text-xs font-medium text-slate-400 dark:text-slate-500">{item.identifier}</td>
              <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">{item.title}</td>
              <td className="px-3 py-2.5"><TypeBadge type={item.item_type} /></td>
              <td className="px-3 py-2.5"><PriorityBadge priority={item.priority} /></td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {item.labels.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />)}
                </div>
              </td>
              <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{item.story_points || "—"}</td>
              <td className="rounded-r-lg px-3 py-2.5">
                <div className="flex -space-x-1.5">
                  {item.assignees.map((a) => <Avatar key={a.id} user={a} size={22} />)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p className="mt-10 text-center text-sm text-slate-400 dark:text-slate-500">No work items match your filters.</p>}
    </div>
  );
}
