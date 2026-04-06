"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatINR } from "@/lib/format";

interface SpendingChartProps {
  data: Array<{ name: string; icon: string; color: string; amount: number }>;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; amount: number } }> }) {
  if (!active || !payload?.length) return null;
  const { name, amount } = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
      <p className="text-foreground font-medium">{name}</p>
      <p className="text-muted-foreground font-amount">{formatINR(amount)}</p>
    </div>
  );
}

export function SpendingChart({ data }: SpendingChartProps) {
  if (!data.length) {
    return (
      <div className="mx-4 bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-medium mb-1">Spending by Category</p>
        <p className="text-xs text-muted-foreground">No expenses this month yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-4 bg-card border border-border rounded-xl p-4">
      <p className="text-sm font-medium mb-4">Spending by Category</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickFormatter={(v: string) => v.split(" ")[0]}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickFormatter={(v: number) => formatINR(v, true)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#262626" }} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
