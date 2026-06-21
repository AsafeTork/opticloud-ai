import type { FastifyInstance } from 'fastify'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (req, reply) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', req.user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return reply.code(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'No organization found' } })
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single()

    if (error || !data) {
      return reply.code(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'Organization not found' } })
    }

    return reply.send({ data, error: null })
  })
}
