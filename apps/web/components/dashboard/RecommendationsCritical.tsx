"use client"

import { Lightbulb, ArrowRight, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type RecommendationPriority = "critical" | "high" | "medium"

export interface Recommendation {
  id: string
  title: string
  description: string
  saving: string
  provider: string
  priority: RecommendationPriority
}

const priorityConfig: Record<
  RecommendationPriority,
  { label: string; badge: string }
> = {
  critical: {
    label: "Crítico",
    badge: "bg-[oklch(0.65_0.22_25/0.15)] text-danger border border-[oklch(0.65_0.22_25/0.30)]",
  },
  high: {
    label: "Alto",
    badge: "bg-[oklch(0.75_0.18_75/0.15)] text-warning border border-[oklch(0.75_0.18_75/0.30)]",
  },
  medium: {
    label: "Médio",
    badge: "bg-[oklch(0.72_0.15_194/0.15)] text-chart-2 border border-[oklch(0.72_0.15_194/0.30)]",
  },
}

interface RecommendationsCriticalProps {
  recommendations: Recommendation[]
  onViewAll?: () => void
}

export function RecommendationsCritical({
  recommendations,
  onViewAll,
}: RecommendationsCriticalProps) {
  if (!recommendations.length) {
    return (
      <div className="card-enter rounded-xl border border-border bg-card p-8 flex flex-col items-center gap-3 text-center">
        <div className="size-10 rounded-full bg-muted flex items-center justify-center">
          <Lightbulb className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Sem recomendações críticas</p>
        <p className="text-xs text-muted-foreground max-w-48">
          Sua infraestrutura está otimizada no momento.
        </p>
      </div>
    )
  }

  return (
    <div className="card-enter rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Recomendações Críticas</h3>
          <span className="px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-xs font-medium">
            {recommendations.length}
          </span>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-primary hover:underline flex items-center gap-1 transition-all duration-150"
          >
            Ver todas
            <ChevronRight className="size-3" />
          </button>
        )}
      </div>

      {/* List */}
      <ul className="divide-y divide-border">
        {recommendations.map((rec, i) => {
          const cfg = priorityConfig[rec.priority]
          return (
            <li
              key={rec.id}
              className="flex items-start gap-4 px-5 py-4 hover:bg-accent transition-colors duration-150 cursor-pointer group"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Icon */}
              <div className="mt-0.5 size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Lightbulb className="size-4 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{rec.title}</p>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", cfg.badge)}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {rec.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="text-success font-medium">{rec.saving}</span> de economia potencial ·{" "}
                  {rec.provider}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="size-4 text-muted-foreground mt-1 shrink-0 group-hover:text-primary transition-colors duration-150" />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
