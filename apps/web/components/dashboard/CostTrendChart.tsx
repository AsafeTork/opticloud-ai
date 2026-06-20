"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface TooltipEntry {
  dataKey: string
  color: string
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}

export interface TrendPoint {
  month: string
  aws: number
  gcp: number
  azure: number
}

interface CostTrendChartProps {
  data: TrendPoint[]
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-medium text-foreground mb-1">{label as string}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="font-medium text-foreground">
            R$ {(p.value ?? 0).toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  )
}

const SERIES = [
  { key: "aws",   color: "oklch(0.60 0.22 264)", label: "AWS"   },
  { key: "gcp",   color: "oklch(0.72 0.15 194)", label: "GCP"   },
  { key: "azure", color: "oklch(0.68 0.18 145)", label: "Azure" },
]

export function CostTrendChart({ data }: CostTrendChartProps) {
  return (
    <div className="card-enter rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Tendência de Custos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Últimos 6 meses por provedor</p>
        </div>
        <div className="flex items-center gap-4">
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ background: s.color }}
              />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="oklch(1 0 0 / 0.06)"
          />
          <XAxis
            dataKey="month"
            tick={{ fill: "oklch(0.55 0.010 264)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "oklch(0.55 0.010 264)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "oklch(1 0 0 / 0.08)" }} />

          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={1.5}
              fill={`url(#grad-${s.key})`}
              dot={false}
              activeDot={{ r: 3, fill: s.color, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
