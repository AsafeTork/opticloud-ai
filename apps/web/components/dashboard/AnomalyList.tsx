"use client"

import { AlertTriangle, TrendingUp, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type AnomalySeverity = "critical" | "high" | "medium"

export interface Anomaly {
  id: string
  title: string
  provider: string
  service: string
  delta: number
  severity: AnomalySeverity
  time: string
}

const severityConfig: Record<
  AnomalySeverity,
  { label: string; dot: string; badge: string; text: string }
> = {
  critical: {
    label: "Crítico",
    dot: "bg-danger",
    badge: "bg-[oklch(0.65_0.22_25/0.15)] text-danger",
    text: "text-danger",
  },
  high: {
    label: "Alto",
    dot: "bg-warning",
    badge: "bg-[oklch(0.75_0.18_75/0.15)] text-warning",
    text: "text-warning",
  },
  medium: {
    label: "Médio",
    dot: "bg-chart-2",
    badge: "bg-[oklch(0.72_0.15_194/0.15)] text-chart-2",
    text: "text-chart-2",
  },
}

interface AnomalyListProps {
  anomalies: Anomaly[]
  onViewAll?: () => void
}

export function AnomalyList({ anomalies, onViewAll }: AnomalyListProps) {
  if (!anomalies.length) {
    return (
      <div className="card-enter rounded-xl border border-border bg-card p-8 flex flex-col items-center gap-3 text-center">
        <div className="size-10 rounded-full bg-muted flex items-center justify-center">
          <AlertTriangle className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Nenhuma anomalia detectada</p>
        <p className="text-xs text-muted-foreground max-w-48">
          Seus custos estão dentro dos padrões esperados.
        </p>
      </div>
    )
  }

  return (
    <div className="card-enter rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Anomalias Detectadas</h3>
          <span className="px-1.5 py-0.5 rounded-md bg-danger/15 text-danger text-xs font-medium">
            {anomalies.length}
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
        {anomalies.map((a, i) => {
          const cfg = severityConfig[a.severity]
          return (
            <li
              key={a.id}
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-accent transition-colors duration-150 cursor-pointer"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Severity dot */}
              <span className={cn("mt-1.5 size-2 rounded-full shrink-0", cfg.dot)} />

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.provider} · {a.service} · {a.time}
                </p>
              </div>

              {/* Delta + badge */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    cfg.text
                  )}
                >
                  <TrendingUp className="size-3" aria-hidden="true" />
                  +{a.delta}%
                </span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", cfg.badge)}>
                  {cfg.label}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
