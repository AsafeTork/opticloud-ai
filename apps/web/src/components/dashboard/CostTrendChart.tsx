"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CostTrendPoint } from "@repo/types";
import { providerColors } from "../../lib/colors";
import { SkeletonChart } from "../ui/Skeleton";

interface Props {
  data: CostTrendPoint[];
  loading?: boolean;
}

function formatUSD(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27] p-3 text-xs shadow-xl">
      <p className="text-[#9CA3AF] mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[#E5E7EB]">{entry.name.toUpperCase()}:</span>
          <span className="font-bold" style={{ color: entry.color }}>{formatUSD(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function CostTrendChart({ data, loading }: Props) {
  if (loading) return <SkeletonChart />;

  return (
    <section className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27]/80 backdrop-blur-md p-6">
      <h2 className="text-sm font-semibold text-[#E5E7EB] mb-6">Tendência de Custos — 6 Meses</h2>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            {(["aws", "gcp", "azure"] as const).map((p) => (
              <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={providerColors[p]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={providerColors[p]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
          <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatUSD} tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "16px", fontSize: "11px", color: "#9CA3AF" }}
            formatter={(v: string) => v.toUpperCase()}
          />
          {(["aws", "gcp", "azure"] as const).map((p) => (
            <Area
              key={p}
              type="monotone"
              dataKey={p}
              stroke={providerColors[p]}
              fill={`url(#grad-${p})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
