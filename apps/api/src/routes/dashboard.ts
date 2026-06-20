import type { FastifyInstance } from 'fastify'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import type { DashboardSummary } from '@repo/types'
import { getConsolidatedCostTrends, getConsolidatedCostByProvider } from '../services/cloud-aggregator.js'
import { getRecentAnomalies } from '../services/anomaly-detector.js'

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

  // ── GET /api/dashboard/summary ─────────────────────────────────────────────
  app.get('/summary', async (req, reply) => {
    const orgId = await getOrgId(req.user.id)
    if (!orgId) {
      return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })
    }

    try {
      const [accountsRes, recsRes, costByProvider] = await Promise.all([
        supabase.from('cloud_accounts').select('id, monthly_cost_usd').eq('organization_id', orgId),
        supabase.from('recommendations').select('category, status, estimated_savings_usd, priority').eq('organization_id', orgId),
        getConsolidatedCostByProvider(orgId),
      ])

      if (accountsRes.error ?? recsRes.error) {
        const msg = accountsRes.error?.message ?? recsRes.error?.message ?? 'Unknown DB error'
        return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: msg } })
      }

      const accounts = accountsRes.data ?? []
      const recs = recsRes.data ?? []
      const pendingRecs = recs.filter((r) => r.status === 'pending' || r.status === 'in_progress')
      const appliedRecs = recs.filter((r) => r.status === 'applied')
      const criticalAlerts = pendingRecs.filter((r) => r.priority === 'critical').length

      const categories = ['cost', 'performance', 'security', 'reliability'] as const
      const savingsByCategory = Object.fromEntries(
        categories.map((cat) => [
          cat,
          pendingRecs
            .filter((r) => r.category === cat)
            .reduce((sum, r) => sum + ((r.estimated_savings_usd as number | null) ?? 0), 0),
        ]),
      ) as DashboardSummary['savings_by_category']

      const summary: DashboardSummary = {
        total_accounts: accounts.length,
        total_monthly_cost_usd: accounts.reduce((s, a) => s + ((a.monthly_cost_usd as number | null) ?? 0), 0),
        pending_recommendations: pendingRecs.length,
        potential_savings_usd: pendingRecs.reduce((s, r) => s + ((r.estimated_savings_usd as number | null) ?? 0), 0),
        implemented_savings_usd: appliedRecs.reduce((s, r) => s + ((r.estimated_savings_usd as number | null) ?? 0), 0),
        critical_alerts: criticalAlerts,
        savings_by_category: savingsByCategory,
        cost_by_provider: costByProvider,
      }

      return reply.send({ data: summary, error: null })
    } catch {
      return reply.code(500).send({ data: null, error: { code: 'NETWORK_ERROR', message: 'Database unavailable' } })
    }
  })

  // ── GET /api/dashboard/cost-trends ────────────────────────────────────────
  app.get('/cost-trends', async (req, reply) => {
    const orgId = await getOrgId(req.user.id)
    if (!orgId) {
      return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })
    }

    try {
      const trends = await getConsolidatedCostTrends(orgId)
      return reply.send({ data: trends, error: null })
    } catch {
      return reply.code(500).send({ data: null, error: { code: 'AGGREGATION_ERROR', message: 'Failed to aggregate cost trends' } })
    }
  })

  // ── GET /api/dashboard/anomalies ──────────────────────────────────────────
  app.get('/anomalies', async (req, reply) => {
    const orgId = await getOrgId(req.user.id)
    if (!orgId) {
      return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })
    }

    try {
      const anomalies = await getRecentAnomalies(orgId, 24)
      return reply.send({ data: anomalies, error: null })
    } catch {
      return reply.code(500).send({ data: null, error: { code: 'ANOMALY_ERROR', message: 'Failed to fetch anomalies' } })
    }
  })
}
