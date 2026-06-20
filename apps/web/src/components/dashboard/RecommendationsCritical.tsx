"use client";

import type { Recommendation } from "@repo/types";
import { priorityColors } from "../../lib/colors";
import { SkeletonList } from "../ui/Skeleton";

interface Props {
  recs: Recommendation[];
  loading?: boolean;
  onUpdateStatus: (id: string, status: Recommendation["status"]) => Promise<void>;
}

const CATEGORY_ICON: Record<string, string> = {
  cost: "💰",
  performance: "⚡",
  security: "🛡️",
  reliability: "🔄",
};

export function RecommendationsCritical({ recs, loading, onUpdateStatus }: Props) {
  if (loading) return <SkeletonList rows={5} />;

  const sorted = [...recs]
    .filter((r) => r.status === "pending" || r.status === "in_progress")
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 8);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27]/80 p-8 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-sm font-medium text-[#E5E7EB]">Sem recomendações pendentes</p>
        <p className="text-xs text-[#6B7280] mt-1">Sua infraestrutura está otimizada</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27]/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2D3E]">
        <h2 className="text-sm font-semibold text-[#E5E7EB]">Recomendações Críticas</h2>
        <span className="text-xs text-[#6B7280]">{sorted.length} pendentes</span>
      </div>
      <ul className="divide-y divide-[#2A2D3E]">
        {sorted.map((rec) => {
          const pc = priorityColors[rec.priority];
          return (
            <li key={rec.id} className="px-4 py-3 hover:bg-[#222535] transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-base shrink-0 mt-0.5" aria-hidden="true">
                    {CATEGORY_ICON[rec.category]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#E5E7EB] truncate">{rec.title}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-1">{rec.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}
                      >
                        {rec.priority.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF]">
                        Confiança: {(rec.ai_confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {rec.estimated_savings_usd && rec.estimated_savings_usd > 0 && (
                    <span className="text-xs font-bold text-[#00D4AA]">
                      −${rec.estimated_savings_usd.toFixed(0)}/mês
                    </span>
                  )}
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => void onUpdateStatus(rec.id, "applied")}
                      className="text-[10px] px-2 py-1 rounded bg-[#00D4AA]/15 text-[#00D4AA] hover:bg-[#00D4AA]/25
                                 focus-visible:ring-2 focus-visible:ring-[#00D4AA] transition-colors min-h-[32px]"
                    >
                      Aplicar
                    </button>
                    <button
                      onClick={() => void onUpdateStatus(rec.id, "dismissed")}
                      className="text-[10px] px-2 py-1 rounded bg-[#2A2D3E] text-[#6B7280] hover:text-[#9CA3AF]
                                 focus-visible:ring-2 focus-visible:ring-[#6B7280] transition-colors min-h-[32px]"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
