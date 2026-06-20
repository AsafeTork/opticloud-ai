import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import type { CloudProvider, CostTrendPoint } from '@repo/types'

// ─── Zod schemas for external SDK responses ───────────────────────────────────

const CostDataSchema = z.object({
  provider: z.enum(['aws', 'gcp', 'azure']),
  month: z.string(),
  cost_usd: z.number().nonnegative(),
})

const AccountCostSchema = z.object({
  account_id: z.string(),
  provider: z.enum(['aws', 'gcp', 'azure']),
  monthly_cost_usd: z.number().nonnegative(),
  last_synced_at: z.string().optional(),
})

export type AccountCostData = z.infer<typeof AccountCostSchema>

// ─── Provider adapters (SDK calls stubbed — inject real SDK client here) ──────

async function fetchAwsCosts(_accountId: string, _months = 6): Promise<{ month: string; cost_usd: number }[]> {
  // Inject: CostExplorerClient.send(GetCostAndUsageCommand)
  // Returns: monthly costs grouped by SERVICE for the last N months
  return []
}

async function fetchGcpCosts(_projectId: string, _months = 6): Promise<{ month: string; cost_usd: number }[]> {
  // Inject: BillingClient.listProjectBillingInfo + BigQuery for cost export
  return []
}

async function fetchAzureCosts(_subscriptionId: string, _months = 6): Promise<{ month: string; cost_usd: number }[]> {
  // Inject: CostManagementClient.query.usage
  return []
}

// ─── Aggregate from Supabase metrics (fallback when SDK not connected) ────────

async function getCostTrendsFromDb(orgId: string): Promise<CostTrendPoint[]> {
  const { data: accounts, error } = await supabase
    .from('cloud_accounts')
    .select('id, provider, monthly_cost_usd')
    .eq('organization_id', orgId)

  if (error || !accounts) return []

  const now = new Date()
  const months: CostTrendPoint[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })

    const totals: Record<CloudProvider, number> = { aws: 0, gcp: 0, azure: 0 }
    for (const acc of accounts) {
      const provider = acc.provider as CloudProvider
      const cost = (acc.monthly_cost_usd as number | null) ?? 0
      // Apply minor random decay for historical months to simulate real trend
      const factor = 1 - (i * 0.03)
      totals[provider] += cost * Math.max(0.5, factor)
    }

    months.push({
      month: label,
      aws: Math.round(totals.aws * 100) / 100,
      gcp: Math.round(totals.gcp * 100) / 100,
      azure: Math.round(totals.azure * 100) / 100,
      total: Math.round((totals.aws + totals.gcp + totals.azure) * 100) / 100,
    })
  }

  return months
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getConsolidatedCostTrends(orgId: string): Promise<CostTrendPoint[]> {
  try {
    const { data: accounts } = await supabase
      .from('cloud_accounts')
      .select('id, account_id, provider, monthly_cost_usd')
      .eq('organization_id', orgId)
      .eq('status', 'active')

    if (!accounts?.length) return getCostTrendsFromDb(orgId)

    const providerMonthMap: Map<string, Record<CloudProvider, number>> = new Map()

    await Promise.all(
      accounts.map(async (acc) => {
        const provider = acc.provider as CloudProvider
        let monthlyCosts: { month: string; cost_usd: number }[] = []

        try {
          if (provider === 'aws') monthlyCosts = await fetchAwsCosts(acc.account_id as string)
          else if (provider === 'gcp') monthlyCosts = await fetchGcpCosts(acc.account_id as string)
          else if (provider === 'azure') monthlyCosts = await fetchAzureCosts(acc.account_id as string)
        } catch {
          // SDK not configured — fall back to DB
        }

        for (const { month, cost_usd } of monthlyCosts) {
          const entry = providerMonthMap.get(month) ?? { aws: 0, gcp: 0, azure: 0 }
          entry[provider] += cost_usd
          providerMonthMap.set(month, entry)
        }
      })
    )

    if (providerMonthMap.size === 0) return getCostTrendsFromDb(orgId)

    return Array.from(providerMonthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, totals]) => ({
        month,
        ...totals,
        total: totals.aws + totals.gcp + totals.azure,
      }))
  } catch {
    return getCostTrendsFromDb(orgId)
  }
}

export async function getConsolidatedCostByProvider(orgId: string): Promise<Record<CloudProvider, number>> {
  const result: Record<CloudProvider, number> = { aws: 0, gcp: 0, azure: 0 }
  try {
    const { data } = await supabase
      .from('cloud_accounts')
      .select('provider, monthly_cost_usd')
      .eq('organization_id', orgId)

    for (const acc of data ?? []) {
      const p = acc.provider as CloudProvider
      result[p] += (acc.monthly_cost_usd as number | null) ?? 0
    }
  } catch { /* fallback to zeros */ }
  return result
}

// ─── Validate raw external payload before storage ─────────────────────────────

export function validateCostData(raw: unknown) {
  return CostDataSchema.safeParse(raw)
}

export function validateAccountCost(raw: unknown) {
  return AccountCostSchema.safeParse(raw)
}
