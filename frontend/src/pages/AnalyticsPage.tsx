import { useParams } from "react-router-dom";
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useProjectAnalytics } from "../api/resources";
import { format } from "date-fns";
import { Activity } from "lucide-react";
import { useTheme } from "../store/theme";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#0ea5e9", none: "#94a3b8",
};
const TYPE_COLORS: Record<string, string> = {
  task: "#3b82f6", bug: "#ef4444", story: "#10b981", epic: "#8b5cf6",
};

export function AnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data } = useProjectAnalytics(projectId);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const tooltipStyle = {
    borderRadius: 8,
    fontSize: 12,
    border: `1px solid ${gridColor}`,
    background: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f172a",
  };

  if (!data) return <div className="p-6 text-sm text-slate-400 dark:text-slate-500">Loading analytics...</div>;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Analytics</h1>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Activity size={13} className="animate-pulse" /> Live · refreshes every 15s
        </span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total work items" value={data.total_work_items} />
        <StatCard label="Completed" value={data.completed_work_items} />
        <StatCard label="Completion rate" value={`${data.completion_rate}%`} />
        <StatCard label="Active labels/priorities" value={data.by_priority.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Work items by status">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.by_state} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: axisColor }} />
              <YAxis type="category" dataKey="state__name" tick={{ fontSize: 11, fill: axisColor }} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {data.by_state.map((entry, i) => (
                  <Cell key={i} fill={entry.state__color || "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Priority breakdown">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.by_priority} dataKey="count" nameKey="priority" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {data.by_priority.map((entry, i) => (
                  <Cell key={i} fill={PRIORITY_COLORS[entry.priority] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Work item types">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.by_type} dataKey="count" nameKey="item_type" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {data.by_type.map((entry, i) => (
                  <Cell key={i} fill={TYPE_COLORS[entry.item_type] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Completed items — last 30 days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.completed_trend.map((d) => ({ ...d, date: format(new Date(d.date), "MMM d") }))}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor }} interval={3} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisColor }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cycle velocity">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.velocity}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="cycle" tick={{ fontSize: 11, fill: axisColor }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisColor }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
              <Bar dataKey="total_points" name="Total points" fill={isDark ? "#065f46" : "#a7f3d0"} radius={[6, 6, 0, 0]} />
              <Bar dataKey="completed_points" name="Completed" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {children}
    </div>
  );
}
