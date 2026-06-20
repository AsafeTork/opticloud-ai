import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const createAccountSchema = z.object({
  provider: z.enum(['aws', 'gcp', 'azure']),
  account_id: z.string().min(1).max(128).trim(),
  account_name: z.string().min(1).max(256).trim(),
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

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (req, reply) => {
    const orgId = await getOrgId(req.user.id)
    if (!orgId) return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })

    try {
      const { data, error } = await supabase
        .from('cloud_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error.message } })
      return reply.send({ data, error: null })
    } catch {
      return reply.code(500).send({ data: null, error: { code: 'NETWORK_ERROR', message: 'Database unavailable' } })
    }
  })

  app.post('/', async (req, reply) => {
    const parsed = createAccountSchema.safeParse(req.body)
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
        .from('cloud_accounts')
        .insert({ ...parsed.data, organization_id: orgId })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return reply.code(409).send({ data: null, error: { code: 'DUPLICATE', message: 'This account already exists in your organization' } })
        }
        return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error.message } })
      }

      return reply.code(201).send({ data, error: null })
    } catch {
      return reply.code(500).send({ data: null, error: { code: 'NETWORK_ERROR', message: 'Database unavailable' } })
    }
  })

  app.delete('/:id', async (req, reply) => {
    const idParsed = uuidSchema.safeParse((req.params as Record<string, unknown>)['id'])
    if (!idParsed.success) {
      return reply.code(400).send({ data: null, error: { code: 'INVALID_ID', message: 'Invalid account ID format' } })
    }

    const orgId = await getOrgId(req.user.id)
    if (!orgId) return reply.code(403).send({ data: null, error: { code: 'NO_ORG', message: 'User has no organization' } })

    try {
      const { error } = await supabase
        .from('cloud_accounts')
        .delete()
        .eq('id', idParsed.data)
        .eq('organization_id', orgId)

      if (error) return reply.code(500).send({ data: null, error: { code: 'DB_ERROR', message: error.message } })
      return reply.code(204).send()
    } catch {
      return reply.code(500).send({ data: null, error: { code: 'NETWORK_ERROR', message: 'Database unavailable' } })
    }
  })
}
