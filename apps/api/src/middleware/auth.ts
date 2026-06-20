import type { FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../lib/supabase.js'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    await reply.code(401).send({ data: null, error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } })
    return
  }

  const token = authHeader.slice(7)

  try {
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      await reply.code(401).send({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } })
      return
    }

    req.user = data.user
  } catch {
    await reply.code(500).send({ data: null, error: { code: 'AUTH_ERROR', message: 'Auth service unavailable' } })
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: import('@supabase/supabase-js').User
  }
}
