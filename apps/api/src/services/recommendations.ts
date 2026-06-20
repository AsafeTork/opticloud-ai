import type {
  Recommendation,
  RecommendationCategory,
  RecommendationPriority,
} from '@repo/types'
import { supabase } from '../lib/supabase.js'

interface AccountRow {
  id: string
  account_id: string
  account_name: string
  provider: string
  status: string
  monthly_cost_usd: number | null
  last_sync_at: string | null
}

interface RuleResult {
  title: string
  description: string
  category: RecommendationCategory
  priority: RecommendationPriority
  estimated_savings_usd: number | null
  ai_confidence: number
  resource_ids: string[]
  metadata: Record<string, unknown>
}

function analyzeAccount(account: AccountRow): RuleResult[] {
  const results: RuleResult[] = []
  const cost = account.monthly_cost_usd ?? 0
  const provider = account.provider.toUpperCase()

  if (cost > 1000) {
    results.push({
      title: `High monthly spend on ${provider} — review resource allocation`,
      description: `Account "${account.account_name}" has a monthly cost of $${cost.toFixed(2)}. Consider rightsizing instances and removing unused resources. Estimated 20% savings with right-sizing.`,
      category: 'cost',
      priority: cost > 5000 ? 'critical' : 'high',
      estimated_savings_usd: Math.round(cost * 0.2 * 100) / 100,
      ai_confidence: 0.85,
      resource_ids: [account.account_id],
      metadata: { trigger: 'high_cost', monthly_cost_usd: cost },
    })
  }

  if (!account.last_sync_at) {
    results.push({
      title: 'Cloud account not synced — enable cost monitoring',
      description: `Account "${account.account_name}" has never been synced. Enable automatic syncing to receive cost optimization recommendations and detect anomalies.`,
      category: 'reliability',
      priority: 'medium',
      estimated_savings_usd: null,
      ai_confidence: 0.95,
      resource_ids: [account.account_id],
      metadata: { trigger: 'no_sync' },
    })
  }

  if (account.status === 'error') {
    results.push({
      title: 'Cloud account in error state — check permissions',
      description: `Account "${account.account_name}" is in an error state. Verify API credentials and IAM permissions to restore cost monitoring and optimization.`,
      category: 'reliability',
      priority: 'critical',
      estimated_savings_usd: null,
      ai_confidence: 1.0,
      resource_ids: [account.account_id],
      metadata: { trigger: 'account_error' },
    })
  }

  return results
}

export async function generateRecommendations(orgId: string): Promise<{ count: number; error: string | null }> {
  try {
    const { data: accounts, error: accErr } = await supabase
      .from('cloud_accounts')
      .select('id, account_id, account_name, provider, status, monthly_cost_usd, last_sync_at')
      .eq('organization_id', orgId)

    if (accErr) return { count: 0, error: accErr.message }
    if (!accounts?.length) return { count: 0, error: null }

    // Fetch existing pending recommendations to avoid duplicates
    const { data: existingRecs } = await supabase
      .from('recommendations')
      .select('cloud_account_id, metadata')
      .eq('organization_id', orgId)
      .eq('status', 'pending')

    const existingTriggers = new Set(
      (existingRecs ?? []).map((r) => {
        const meta = r.metadata as Record<string, unknown>
        return `${String(r.cloud_account_id)}:${String(meta['trigger'] ?? '')}`
      })
    )

    const toInsert: Omit<Recommendation, 'id' | 'created_at' | 'updated_at'>[] = []

    for (const account of accounts as AccountRow[]) {
      const rules = analyzeAccount(account)
      for (const r of rules) {
        const dedupeKey = `${account.id}:${String(r.metadata['trigger'])}`
        if (existingTriggers.has(dedupeKey)) continue

        toInsert.push({
          organization_id: orgId,
          cloud_account_id: account.id,
          status: 'pending',
          ...r,
        })
      }
    }

    if (!toInsert.length) return { count: 0, error: null }

    const { error: insErr } = await supabase.from('recommendations').insert(toInsert)
    return { count: toInsert.length, error: insErr?.message ?? null }
  } catch {
    return { count: 0, error: 'Failed to connect to database' }
  }
}

export async function getOrgRecommendations(orgId: string): Promise<{ data: Recommendation[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    return { data: (data ?? []) as Recommendation[], error: error?.message ?? null }
  } catch {
    return { data: [], error: 'Failed to connect to database' }
  }
}
