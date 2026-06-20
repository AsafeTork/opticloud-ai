"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { CloudProvider } from "@repo/types";
import { providerColors } from "../../lib/colors";
import { SkeletonChart } from "../ui/Skeleton";

interface Props {
  data: Record<CloudProvider, number>;
  loading?: boolean;
}

const PROVIDER_LABEL: Record<CloudProvider, string> = { aws: "AWS", gcp: "GCP", azure: "Azure" };

function formatUSD(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { pct: number } }[];
}) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  return (
    <div className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27] p-3 text-xs shadow-xl">
      <p className="font-bold text-[#E5E7EB]">{entry.name}</p>
      <p className="text-[#9CA3AF]">{formatUSD(entry.value)} <span className="text-[#6B7280]">({entry.payload.pct.toFixed(1)}%)</span></p>
    </div>
  );
};

export function ProviderBreakdown({ data, loading }: Props) {
  if (loading) return <SkeletonChart />;

  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const chartData = (Object.keys(data) as CloudProvider[])
    .filter((p) => data[p] > 0)
    .map((p) => ({ name: PROVIDER_LABEL[p], value: data[p], key: p, pct: total > 0 ? (data[p] / total) * 100 : 0 }));

  return (
    <section className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27]/80 backdrop-blur-md p-6">
      <h2 className="text-sm font-semibold text-[#E5E7EB] mb-4">Distribuição por Provedor</h2>
      {total === 0 ? (
        <div className="h-52 flex items-center justify-center text-[#6B7280] text-sm">
          Sem dados de custo
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={providerColors[entry.key as CloudProvider]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="space-y-2 mt-2">
            {chartData.map((entry) => (
              <li key={entry.key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: providerColors[entry.key as CloudProvider] }} />
                  <span className="text-[#9CA3AF]">{entry.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#E5E7EB] font-medium">{formatUSD(entry.value)}</span>
                  <span className="text-[#6B7280] ml-1">({entry.pct.toFixed(1)}%)</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
