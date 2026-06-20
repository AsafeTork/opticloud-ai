import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { accountRoutes } from './routes/accounts.js'
import { recommendationRoutes } from './routes/recommendations.js'
import { dashboardRoutes } from './routes/dashboard.js'

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

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error)
    void reply.code(error.statusCode ?? 500).send({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    })
  })

  const port = parseInt(process.env['API_PORT'] ?? '3001', 10)
  await app.listen({ port, host: '0.0.0.0' })
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
