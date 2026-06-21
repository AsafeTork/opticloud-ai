import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const createBudgetSchema = z.object({
  name: z.string().min(1).max(256).trim(),
  provider: z.enum(['aws', 'gcp', 'azure', 'all']),
  amount_usd: z.number().positive(),
  period: z.enum(['monthly', 'quarterly', 'annual']),
  alert_threshold_pct: z.number().min(1).max(100).default(80),
})

const uuidSchema = z.string().uuid()

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

export async function budgetRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (req, reply) => {
    const orgId = await getOrgId(req.user.id)
    if (!orgId) {
      return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })
    }

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error.message } })
    }

    return reply.send({ data: data ?? [], error: null })
  })

  app.post('/', async (req, reply) => {
    const orgId = await getOrgId(req.user.id)
    if (!orgId) {
      return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })
    }

    const parsed = createBudgetSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    }

    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...parsed.data, organization_id: orgId, current_spend_usd: 0 })
      .select()
      .single()

    if (error || !data) {
      return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error?.message ?? 'Insert failed' } })
    }

    return reply.code(201).send({ data, error: null })
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parseResult = uuidSchema.safeParse(id)
    if (!parseResult.success) {
      return reply.code(400).send({ data: null, error: { code: 'INVALID_ID', message: 'Invalid budget id' } })
    }

    const orgId = await getOrgId(req.user.id)
    if (!orgId) {
      return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })
    }

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) {
      return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error.message } })
    }

    return reply.code(204).send()
  })
}
