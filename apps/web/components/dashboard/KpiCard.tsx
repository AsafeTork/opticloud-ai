"use client"

import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SparkPoint {
  v: number
}

interface KpiCardProps {
  label: string
  value: string
  delta: number       // % variação vs mês anterior
  deltaLabel?: string
  icon: LucideIcon
  sparkline: SparkPoint[]
  colorClass?: string // e.g. "text-chart-1"
  index?: number      // para stagger
}

function Sparkline({
  data,
  color,
}: {
  data: SparkPoint[]
  color: string
}) {
  if (!data.length) return null
  const min = Math.min(...data.map((d) => d.v))
  const max = Math.max(...data.map((d) => d.v))
  const range = max - min || 1
  const W = 96
  const H = 32
  const step = W / (data.length - 1)

  const points = data
    .map((d, i) => {
      const x = i * step
      const y = H - ((d.v - min) / range) * H
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      aria-hidden="true"
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={`currentColor`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={color}
      />
    </svg>
  )
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel = "vs mês anterior",
  icon: Icon,
  sparkline,
  colorClass = "text-chart-1",
  index = 0,
}: KpiCardProps) {
  const isPositive = delta > 0
  const isNeutral = delta === 0

  const DeltaIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
  const deltaColor = isNeutral
    ? "text-muted-foreground"
    : isPositive
    ? "text-danger"
    : "text-success"

  return (
    <div
      className="card-enter rounded-xl border border-border bg-card p-5 space-y-3 hover:border-[oklch(1_0_0/0.15)] transition-colors duration-150 cursor-default"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div
          className={cn(
            "size-7 rounded-lg flex items-center justify-center",
            "bg-[oklch(0.20_0.012_264)]"
          )}
        >
          <Icon className={cn("size-3.5", colorClass)} />
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl font-semibold text-foreground tracking-tight">
        {value}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            deltaColor
          )}
        >
          <DeltaIcon className="size-3" aria-hidden="true" />
          {isPositive ? "+" : ""}
          {delta}% {deltaLabel}
        </span>

        <Sparkline data={sparkline} color={colorClass} />
      </div>
    </div>
  )
}
