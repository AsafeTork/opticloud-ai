import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { generateRecommendations, getOrgRecommendations } from '../services/recommendations.js'

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'applied', 'dismissed', 'in_progress']),
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

export async function recommendationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (req, reply) => {
    const orgId = await getOrgId(req.user.id)
    if (!orgId) return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })

    const { data, error } = await getOrgRecommendations(orgId)
    if (error) return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error } })
    return reply.send({ data, error: null })
  })

  app.post('/generate', async (req, reply) => {
    const orgId = await getOrgId(req.user.id)
    if (!orgId) return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })

    const { count, error } = await generateRecommendations(orgId)
    if (error) return reply.code(500).send({ data: null, error: { code: 'GENERATION_ERROR', message: error } })
    return reply.send({ data: { generated: count }, error: null })
  })

  app.patch('/:id', async (req, reply) => {
    const idParsed = uuidSchema.safeParse((req.params as Record<string, unknown>)['id'])
    if (!idParsed.success) {
      return reply.code(400).send({ data: null, error: { code: 'INVALID_ID', message: 'Invalid recommendation ID format' } })
    }

    const parsed = updateStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join(', ') },
      })
    }

    const orgId = await getOrgId(req.user.id)
    if (!orgId) return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })

    try {
      const { data, error } = await supabase
        .from('recommendations')
        .update({ status: parsed.data.status })
        .eq('id', idParsed.data)
        .eq('organization_id', orgId)
        .select()
        .single()

      if (error) return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error.message } })
      return reply.send({ data, error: null })
    } catch {
      return reply.code(500).send({ data: null, error: { code: 'NETWORK_ERROR', message: 'Database unavailable' } })
    }
  })
}
