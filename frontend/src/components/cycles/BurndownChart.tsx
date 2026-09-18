import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { BurndownData } from "../../types";
import { format } from "date-fns";
import { useTheme } from "../../store/theme";

export function BurndownChart({ data }: { data: BurndownData }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const idealColor = isDark ? "#64748b" : "#94a3b8";

  const merged = data.ideal.map((point, i) => ({
    date: format(new Date(point.date), "MMM d"),
    ideal: point.remaining,
    actual: data.actual[i]?.remaining ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={merged} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisColor }} />
        <YAxis tick={{ fontSize: 11, fill: axisColor }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${gridColor}`,
            fontSize: 12,
            background: isDark ? "#0f172a" : "#ffffff",
            color: isDark ? "#e2e8f0" : "#0f172a",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
        <Line type="monotone" dataKey="ideal" name="Ideal" stroke={idealColor} strokeDasharray="5 5" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="actual" name="Actual" stroke="#10b981" dot={{ r: 3 }} strokeWidth={2.5} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
