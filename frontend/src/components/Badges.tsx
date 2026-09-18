import clsx from "clsx";
import { AlertTriangle, ArrowUp, Equal, ArrowDown, Minus } from "lucide-react";
import type { Priority, ItemType, User } from "../types";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, { label: string; icon: React.ReactNode; className: string }> = {
    urgent: { label: "Urgent", icon: <AlertTriangle size={12} />, className: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400" },
    high: { label: "High", icon: <ArrowUp size={12} />, className: "bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400" },
    medium: { label: "Medium", icon: <Equal size={12} />, className: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400" },
    low: { label: "Low", icon: <ArrowDown size={12} />, className: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400" },
    none: { label: "None", icon: <Minus size={12} />, className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
  };
  const cfg = map[priority] ?? map.none;
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: ItemType }) {
  const map: Record<ItemType, { label: string; className: string }> = {
    task: { label: "Task", className: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400" },
    bug: { label: "Bug", className: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400" },
    story: { label: "Story", className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" },
    epic: { label: "Epic", className: "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400" },
  };
  const cfg = map[type] ?? map.task;
  return <span className={clsx("rounded px-1.5 py-0.5 text-[11px] font-medium", cfg.className)}>{cfg.label}</span>;
}

export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

export function Avatar({ user, size = 22 }: { user?: User; size?: number }) {
  if (!user) return <div className="rounded-full bg-slate-200 dark:bg-slate-700" style={{ width: size, height: size }} />;
  const initials = (user.username || "?").slice(0, 2).toUpperCase();
  const hue = Math.abs(hashCode(user.username)) % 360;
  return (
    <div
      title={user.username}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-slate-900"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: `hsl(${hue}, 55%, 45%)` }}
    >
      {initials}
    </div>
  );
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return hash;
}
