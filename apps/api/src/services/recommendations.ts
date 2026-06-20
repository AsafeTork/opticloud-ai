import type {
  Recommendation,
  RecommendationCategory,
  RecommendationPriority,
  CloudAccount,
} from '@repo/types'
import { supabase } from '../lib/supabase.js'

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

function analyzeAccount(account: CloudAccount): RuleResult[] {
  const results: RuleResult[] = []
  const cost = account.monthly_cost_usd ?? 0

  if (cost > 1000) {
    results.push({
      title: 'High monthly spend detected — review resource allocation',
      description: `Your ${account.provider.toUpperCase()} account "${account.account_name}" has a monthly cost of $${cost.toFixed(2)}. Consider rightsizing instances and reviewing unused resources.`,
      category: 'cost',
      priority: cost > 5000 ? 'critical' : 'high',
      estimated_savings_usd: cost * 0.2,
      ai_confidence: 0.85,
      resource_ids: [account.account_id],
      metadata: { trigger: 'high_cost', monthly_cost_usd: cost },
    })
  }

  if (!account.last_sync_at) {
    results.push({
      title: 'Cloud account not synced — enable monitoring',
      description: `Account "${account.account_name}" has never been synced. Enable automatic syncing to get cost optimization recommendations.`,
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
      title: 'Cloud account in error state',
      description: `Account "${account.account_name}" is in an error state. Check credentials and permissions to restore monitoring.`,
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
  const { data: accounts, error: accErr } = await supabase
    .from('cloud_accounts')
    .select('*')
    .eq('organization_id', orgId)

  if (accErr) return { count: 0, error: accErr.message }
  if (!accounts?.length) return { count: 0, error: null }

  const toInsert: Omit<Recommendation, 'id' | 'created_at' | 'updated_at'>[] = []

  for (const account of accounts as CloudAccount[]) {
    const rules = analyzeAccount(account)
    for (const r of rules) {
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
}

export async function getOrgRecommendations(orgId: string): Promise<{ data: Recommendation[]; error: string | null }> {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  return { data: (data ?? []) as Recommendation[], error: error?.message ?? null }
}
