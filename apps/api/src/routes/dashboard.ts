import type { FastifyInstance } from 'fastify'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import type { DashboardSummary } from '@repo/types'

async function getOrgId(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()
    return (data?.organization_id as string | null) ?? null
  } catch {
    return null
  }
}

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req, reply) => {
    const orgId = await getOrgId(req.user.id)
    if (!orgId) return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })

    try {
      const [accountsRes, recsRes] = await Promise.all([
        supabase.from('cloud_accounts').select('id, monthly_cost_usd').eq('organization_id', orgId),
        supabase.from('recommendations').select('category, status, estimated_savings_usd').eq('organization_id', orgId),
      ])

      if (accountsRes.error ?? recsRes.error) {
        const msg = accountsRes.error?.message ?? recsRes.error?.message ?? 'Unknown DB error'
        return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: msg } })
      }

      const accounts = accountsRes.data ?? []
      const recs = recsRes.data ?? []
      const pendingRecs = recs.filter((r) => r.status === 'pending')

      const categories = ['cost', 'performance', 'security', 'reliability'] as const
      const savingsByCategory = Object.fromEntries(
        categories.map((cat) => [
          cat,
          pendingRecs
            .filter((r) => r.category === cat)
            .reduce((sum, r) => sum + ((r.estimated_savings_usd as number | null) ?? 0), 0),
        ])
      ) as DashboardSummary['savings_by_category']

      const summary: DashboardSummary = {
        total_accounts: accounts.length,
        total_monthly_cost_usd: accounts.reduce((s, a) => s + ((a.monthly_cost_usd as number | null) ?? 0), 0),
        pending_recommendations: pendingRecs.length,
        potential_savings_usd: pendingRecs.reduce((s, r) => s + ((r.estimated_savings_usd as number | null) ?? 0), 0),
        savings_by_category: savingsByCategory,
      }

      return reply.send({ data: summary, error: null })
    } catch {
      return reply.code(500).send({ data: null, error: { code: 'NETWORK_ERROR', message: 'Database unavailable' } })
    }
  })
}
