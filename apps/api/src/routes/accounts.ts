import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const createAccountSchema = z.object({
  provider: z.enum(['aws', 'gcp', 'azure']),
  account_id: z.string().min(1).max(128),
  account_name: z.string().min(1).max(256),
})

export async function accountRoutes(app: FastifyInstance): Promise<void> {
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

    const { data, error } = await supabase
      .from('cloud_accounts')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (error) return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error.message } })
    return reply.send({ data, error: null })
  })

  app.post('/', async (req, reply) => {
    const parsed = createAccountSchema.safeParse(req.body)
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
      .from('cloud_accounts')
      .insert({ ...parsed.data, organization_id: profile.organization_id })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return reply.code(409).send({ data: null, error: { code: 'DUPLICATE', message: 'Account already exists' } })
      }
      return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error.message } })
    }

    return reply.code(201).send({ data, error: null })
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', req.user.id)
      .single()

    if (!profile?.organization_id) {
      return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })
    }

    const { error } = await supabase
      .from('cloud_accounts')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (error) return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error.message } })
    return reply.code(204).send()
  })
}
