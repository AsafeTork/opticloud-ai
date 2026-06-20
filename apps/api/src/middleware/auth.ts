import type { FastifyRequest, FastifyReply } from 'fastify'
import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    await reply.code(401).send({ data: null, error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } })
    return
  }

  const url = process.env['SUPABASE_URL']!
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']!
  const client = createClient(url, key, { auth: { persistSession: false } })

  const { data, error } = await client.auth.getUser(token)

  if (error || !data.user) {
    await reply.code(401).send({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } })
    return
  }

  req.user = data.user
}

declare module 'fastify' {
  interface FastifyRequest {
    user: import('@supabase/supabase-js').User
  }
}
