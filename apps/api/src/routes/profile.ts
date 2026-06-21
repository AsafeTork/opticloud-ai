import type { FastifyInstance } from 'fastify'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (req, reply) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error || !data) {
      return reply.code(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' } })
    }

    return reply.send({ data, error: null })
  })
}
