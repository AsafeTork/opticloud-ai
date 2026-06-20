"use client";

import type { Anomaly } from "@repo/types";
import { priorityColors, providerColors } from "../../lib/colors";
import { SkeletonList } from "../ui/Skeleton";

interface Props {
  anomalies: Anomaly[];
  loading?: boolean;
}

const SEVERITY_MAP = {
  critical: priorityColors.critical,
  warning: priorityColors.medium,
  info: priorityColors.low,
} as const;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `há ${h}h`;
  return `há ${m}m`;
}

function formatUSD(v: number) {
  return `$${v.toFixed(2)}`;
}

export function AnomalyList({ anomalies, loading }: Props) {
  if (loading) return <SkeletonList rows={3} />;

  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27]/80 p-8 text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="text-sm font-medium text-[#E5E7EB]">Nenhuma anomalia nas últimas 24h</p>
        <p className="text-xs text-[#6B7280] mt-1">Todos os custos dentro do esperado</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27]/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2D3E]">
        <h2 className="text-sm font-semibold text-[#E5E7EB]">Anomalias — Últimas 24h</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF4757]/15 text-[#FF4757] font-medium">
          {anomalies.length}
        </span>
      </div>
      <ul className="divide-y divide-[#2A2D3E]">
        {anomalies.map((a) => {
          const sc = SEVERITY_MAP[a.severity];
          return (
            <li key={a.id} className="px-4 py-3 hover:bg-[#222535] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="mt-0.5 shrink-0 w-2 h-2 rounded-full"
                    style={{ backgroundColor: sc.text }}
                    aria-label={`Severidade: ${a.severity}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#E5E7EB] truncate">{a.title}</p>
                    <p className="text-xs text-[#9CA3AF] truncate mt-0.5">{a.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                      >
                        {a.severity.toUpperCase()}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white"
                        style={{ backgroundColor: providerColors[a.provider] + "33", color: providerColors[a.provider] }}
                      >
                        {a.provider.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-[#FF4757]">+{formatUSD(a.actual_cost_usd - a.expected_cost_usd)}</p>
                  <p className="text-[10px] text-[#6B7280]">+{a.deviation_pct.toFixed(0)}%</p>
                  <p className="text-[10px] text-[#6B7280] mt-1">{timeAgo(a.detected_at)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
