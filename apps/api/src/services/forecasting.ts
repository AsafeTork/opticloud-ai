import { supabase } from '../lib/supabase.js'
import type { CostForecast, ForecastPoint } from '@repo/types'

// ─── Linear regression (OLS) ─────────────────────────────────────────────────

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 }

  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, xi, i) => a + xi * (ys[i] ?? 0), 0)
  const sumX2 = xs.reduce((a, xi) => a + xi * xi, 0)

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function standardError(xs: number[], ys: number[], slope: number, intercept: number): number {
  const residuals = ys.map((y, i) => y - (slope * xs[i]! + intercept))
  const sse = residuals.reduce((a, r) => a + r * r, 0)
  return Math.sqrt(sse / Math.max(xs.length - 2, 1))
}

// ─── Build forecast points ────────────────────────────────────────────────────

function buildForecastPoints(
  slope: number,
  intercept: number,
  se: number,
  baseIndex: number,
  months = 3,
): ForecastPoint[] {
  return Array.from({ length: months }, (_, i) => {
    const x = baseIndex + i + 1
    const predicted = Math.max(0, slope * x + intercept)
    const margin = se * 1.96 // 95% CI
    const date = new Date()
    date.setMonth(date.getMonth() + i + 1)
    return {
      month: date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      predicted_usd: Math.round(predicted * 100) / 100,
      lower_bound_usd: Math.round(Math.max(0, predicted - margin) * 100) / 100,
      upper_bound_usd: Math.round((predicted + margin) * 100) / 100,
    }
  })
}

function classifyTrend(slope: number, currentCost: number): { trend: CostForecast['trend']; trend_pct: number } {
  if (currentCost === 0) return { trend: 'stable', trend_pct: 0 }
  const pct = (slope / currentCost) * 100
  if (pct > 5) return { trend: 'increasing', trend_pct: Math.round(pct * 10) / 10 }
  if (pct < -5) return { trend: 'decreasing', trend_pct: Math.round(Math.abs(pct) * 10) / 10 }
  return { trend: 'stable', trend_pct: Math.round(Math.abs(pct) * 10) / 10 }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function forecastOrgCosts(orgId: string): Promise<CostForecast | null> {
  try {
    const { data: accounts, error } = await supabase
      .from('cloud_accounts')
      .select('monthly_cost_usd, last_sync_at, created_at')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (error || !accounts?.length) return null

    // Build monthly data points from accounts
    // In prod: query cost_trends table populated by cloud-aggregator
    const costs = accounts
      .map((a) => (a.monthly_cost_usd as number | null) ?? 0)
      .filter((c) => c > 0)

    if (costs.length < 2) {
      const current = costs[0] ?? 0
      return {
        next_month_usd: current,
        confidence: 0.5,
        trend: 'stable',
        trend_pct: 0,
        points: buildForecastPoints(0, current, current * 0.1, 0),
      }
    }

    const xs = costs.map((_, i) => i)
    const { slope, intercept } = linearRegression(xs, costs)
    const se = standardError(xs, costs, slope, intercept)

    const nextX = costs.length
    const nextMonthUsd = Math.max(0, slope * nextX + intercept)

    // R² as proxy for confidence
    const meanY = costs.reduce((a, b) => a + b, 0) / costs.length
    const ssTot = costs.reduce((a, y) => a + (y - meanY) ** 2, 0)
    const ssRes = costs.reduce((a, y, i) => a + (y - (slope * xs[i]! + intercept)) ** 2, 0)
    const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot)

    const { trend, trend_pct } = classifyTrend(slope, costs[costs.length - 1] ?? 0)

    return {
      next_month_usd: Math.round(nextMonthUsd * 100) / 100,
      confidence: Math.round(r2 * 100) / 100,
      trend,
      trend_pct,
      points: buildForecastPoints(slope, intercept, se, nextX - 1),
    }
  } catch {
    return null
  }
}
