import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { generateRecommendations, getOrgRecommendations } from '../services/recommendations.js'

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'applied', 'dismissed', 'in_progress']),
})

export async function recommendationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (req, reply) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', req.user.id)
      .single()

    if (!profile?.organization_id) {
      return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })
    }

    const { data, error } = await getOrgRecommendations(profile.organization_id as string)
    if (error) return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error } })
    return reply.send({ data, error: null })
  })

  app.post('/generate', async (req, reply) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', req.user.id)
      .single()

    if (!profile?.organization_id) {
      return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })
    }

    const { count, error } = await generateRecommendations(profile.organization_id as string)
    if (error) return reply.code(500).send({ data: null, error: { code: 'GENERATION_ERROR', message: error } })
    return reply.send({ data: { generated: count }, error: null })
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = updateStatusSchema.safeParse(req.body)

    if (!parsed.success) {
      return reply.code(400).send({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', req.user.id)
      .single()

    if (!profile?.organization_id) {
      return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })
    }

    const { data, error } = await supabase
      .from('recommendations')
      .update({ status: parsed.data.status })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error.message } })
    return reply.send({ data, error: null })
  })
}
