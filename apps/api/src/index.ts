import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { accountRoutes } from './routes/accounts.js'
import { recommendationRoutes } from './routes/recommendations.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { profileRoutes } from './routes/profile.js'
import { organizationRoutes } from './routes/organization.js'
import { budgetRoutes } from './routes/budgets.js'

const app = Fastify({ logger: { level: process.env['LOG_LEVEL'] ?? 'info' } })

async function bootstrap(): Promise<void> {
  await app.register(helmet)
  await app.register(cors, {
    origin: process.env['API_CORS_ORIGIN'] ?? 'http://localhost:3000',
    credentials: true,
  })
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })

  await app.register(accountRoutes, { prefix: '/api/accounts' })
  await app.register(recommendationRoutes, { prefix: '/api/recommendations' })
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' })
  await app.register(profileRoutes, { prefix: '/api/profile' })
  await app.register(organizationRoutes, { prefix: '/api/organization' })
  await app.register(budgetRoutes, { prefix: '/api/budgets' })

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err)
    const statusCode = err instanceof Error && 'statusCode' in err ? (err as { statusCode: number }).statusCode : 500
    const message = err instanceof Error ? err.message : 'Internal server error'
    void reply.code(statusCode).send({
      data: null,
      error: { code: 'INTERNAL_ERROR', message },
    })
  })

  const port = parseInt(process.env['API_PORT'] ?? '3001', 10)
  await app.listen({ port, host: '0.0.0.0' })
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
