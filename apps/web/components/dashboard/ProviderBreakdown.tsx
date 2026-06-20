"use client"

import { cn } from "@/lib/utils"

export interface ProviderItem {
  name: string
  amount: number
  pct: number
  color: string // tailwind text color
  bar: string   // tailwind bg color
}

interface ProviderBreakdownProps {
  items: ProviderItem[]
  total: string
}

export function ProviderBreakdown({ items, total }: ProviderBreakdownProps) {
  return (
    <div className="card-enter rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Distribuição por Provedor</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Custo total: {total}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{item.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  R$ {item.amount.toLocaleString("pt-BR")}
                </span>
                <span className={cn("font-semibold w-10 text-right", item.color)}>
                  {item.pct}%
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", item.bar)}
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
