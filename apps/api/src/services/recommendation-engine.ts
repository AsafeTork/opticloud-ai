import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import type {
  Recommendation,
  RecommendationCategory,
  RecommendationPriority,
} from '@repo/types'

// ─── Rule contract ────────────────────────────────────────────────────────────

interface RuleContext {
  account: AccountRow
  metrics: MetricRow[]
}

interface RuleResult {
  title: string
  description: string
  category: RecommendationCategory
  priority: RecommendationPriority
  estimated_savings_usd: number | null
  ai_confidence: number
  resource_ids: string[]
  metadata: Record<string, unknown>
}

type Rule = {
  id: string
  name: string
  evaluate: (ctx: RuleContext) => RuleResult | null
}

interface AccountRow {
  id: string
  account_id: string
  account_name: string
  provider: string
  status: string
  monthly_cost_usd: number | null
  last_sync_at: string | null
}

interface MetricRow {
  resource_id: string
  resource_type: string
  metric_name: string
  value: number
  unit: string
  recorded_at: string
}

// ─── 8 Rules ─────────────────────────────────────────────────────────────────

const RULES: Rule[] = [
  // ── CUSTO 1: Downsize EC2 ociosas (<20% CPU) ─────────────────────────────
  {
    id: 'downsize_idle_ec2',
    name: 'Downsize EC2 com baixa utilização',
    evaluate({ account, metrics }) {
      if (account.provider !== 'aws') return null
      const cpuMetrics = metrics.filter(
        (m) => m.resource_type === 'ec2_instance' && m.metric_name === 'cpu_utilization_pct',
      )
      const idleInstances = cpuMetrics.filter((m) => m.value < 20)
      if (!idleInstances.length) return null

      const cost = account.monthly_cost_usd ?? 0
      const savings = cost * 0.35 * (idleInstances.length / Math.max(cpuMetrics.length, 1))

      return {
        title: `Downsize ${idleInstances.length} instância(s) EC2 ociosa(s)`,
        description:
          `${idleInstances.length} instância(s) na conta "${account.account_name}" com CPU < 20%. ` +
          `Reduzir o tipo de instância pode gerar até $${savings.toFixed(0)}/mês em economia.`,
        category: 'cost',
        priority: savings > 500 ? 'critical' : savings > 200 ? 'high' : 'medium',
        estimated_savings_usd: Math.round(savings * 100) / 100,
        ai_confidence: 0.88,
        resource_ids: idleInstances.map((m) => m.resource_id),
        metadata: { trigger: 'downsize_idle_ec2', idle_count: idleInstances.length },
      }
    },
  },

  // ── CUSTO 2: S3 com < 10% de uso ─────────────────────────────────────────
  {
    id: 'cleanup_unused_s3',
    name: 'Remover dados não utilizados no S3',
    evaluate({ account, metrics }) {
      if (account.provider !== 'aws') return null
      const s3Metrics = metrics.filter(
        (m) => m.resource_type === 's3_bucket' && m.metric_name === 'access_rate_pct',
      )
      const unusedBuckets = s3Metrics.filter((m) => m.value < 10)
      if (!unusedBuckets.length) return null

      const cost = account.monthly_cost_usd ?? 0
      const savings = cost * 0.1 * (unusedBuckets.length / Math.max(s3Metrics.length, 1))

      return {
        title: `${unusedBuckets.length} bucket(s) S3 sem utilização significativa`,
        description:
          `Buckets com taxa de acesso < 10%. Considere mover para S3 Glacier ou excluir dados obsoletos. ` +
          `Potencial de economia: $${savings.toFixed(0)}/mês.`,
        category: 'cost',
        priority: 'medium',
        estimated_savings_usd: Math.round(savings * 100) / 100,
        ai_confidence: 0.82,
        resource_ids: unusedBuckets.map((m) => m.resource_id),
        metadata: { trigger: 'cleanup_unused_s3', unused_count: unusedBuckets.length },
      }
    },
  },

  // ── CUSTO 3: Savings Plans (>30 dias de uso constante) ───────────────────
  {
    id: 'savings_plan',
    name: 'Comprar Savings Plan AWS',
    evaluate({ account }) {
      if (account.provider !== 'aws') return null
      const cost = account.monthly_cost_usd ?? 0
      if (cost < 500) return null

      const daysSinceSync = account.last_sync_at
        ? (Date.now() - new Date(account.last_sync_at).getTime()) / 86_400_000
        : 999

      if (daysSinceSync > 60) return null // conta inativa

      const savings = cost * 0.28

      return {
        title: 'Adquirir AWS Savings Plan — 28% de desconto',
        description:
          `Conta "${account.account_name}" tem gasto consistente de $${cost.toFixed(0)}/mês. ` +
          `Um Compute Savings Plan de 1 ano pode economizar até $${savings.toFixed(0)}/mês.`,
        category: 'cost',
        priority: cost > 2000 ? 'high' : 'medium',
        estimated_savings_usd: Math.round(savings * 100) / 100,
        ai_confidence: 0.91,
        resource_ids: [account.account_id],
        metadata: { trigger: 'savings_plan', monthly_spend: cost },
      }
    },
  },

  // ── PERFORMANCE 1: Ativar CDN CloudFront ─────────────────────────────────
  {
    id: 'enable_cdn',
    name: 'Ativar CloudFront CDN',
    evaluate({ account, metrics }) {
      if (account.provider !== 'aws') return null
      const responseTimeMetrics = metrics.filter(
        (m) => m.resource_type === 'api_gateway' && m.metric_name === 'response_time_ms',
      )
      const slowEndpoints = responseTimeMetrics.filter((m) => m.value > 500)
      if (!slowEndpoints.length) return null

      return {
        title: `Ativar CloudFront para ${slowEndpoints.length} endpoint(s) lento(s)`,
        description:
          `Response time médio > 500ms detectado. ` +
          `Adicionar CloudFront pode reduzir latência em 60-80% para usuários globais.`,
        category: 'performance',
        priority: 'high',
        estimated_savings_usd: null,
        ai_confidence: 0.87,
        resource_ids: slowEndpoints.map((m) => m.resource_id),
        metadata: { trigger: 'enable_cdn', slow_count: slowEndpoints.length },
      }
    },
  },

  // ── PERFORMANCE 2: Auto-scaling em picos de CPU ───────────────────────────
  {
    id: 'autoscaling_cpu',
    name: 'Configurar Auto-scaling por CPU',
    evaluate({ account, metrics }) {
      const cpuMetrics = metrics.filter(
        (m) => m.resource_type === 'ec2_instance' && m.metric_name === 'cpu_utilization_pct',
      )
      const overloadedInstances = cpuMetrics.filter((m) => m.value > 80)
      if (!overloadedInstances.length) return null

      return {
        title: `Auto-scaling: ${overloadedInstances.length} instância(s) com CPU > 80%`,
        description:
          `Instâncias na conta "${account.account_name}" operando próximas à capacidade máxima. ` +
          `Configurar Auto Scaling Group evita indisponibilidade em picos.`,
        category: 'performance',
        priority: overloadedInstances.length > 3 ? 'critical' : 'high',
        estimated_savings_usd: null,
        ai_confidence: 0.93,
        resource_ids: overloadedInstances.map((m) => m.resource_id),
        metadata: { trigger: 'autoscaling_cpu', overloaded_count: overloadedInstances.length },
      }
    },
  },

  // ── SEGURANÇA 1: Remover acesso público — mover para VPC ─────────────────
  {
    id: 'move_to_vpc',
    name: 'Remover acesso público — mover para VPC',
    evaluate({ account, metrics }) {
      const publicInstances = metrics.filter(
        (m) => m.resource_type === 'ec2_instance' && m.metric_name === 'public_ip_attached' && m.value === 1,
      )
      if (!publicInstances.length) return null

      return {
        title: `${publicInstances.length} instância(s) com IP público exposto`,
        description:
          `Instâncias em "${account.account_name}" com acesso público direto. ` +
          `Mova para VPC privada e use Load Balancer/NAT Gateway para acesso controlado.`,
        category: 'security',
        priority: 'critical',
        estimated_savings_usd: null,
        ai_confidence: 0.97,
        resource_ids: publicInstances.map((m) => m.resource_id),
        metadata: { trigger: 'move_to_vpc', exposed_count: publicInstances.length },
      }
    },
  },

  // ── SEGURANÇA 2: Ativar criptografia AES-256 no S3 ───────────────────────
  {
    id: 's3_encryption',
    name: 'Ativar criptografia S3 AES-256',
    evaluate({ account, metrics }) {
      if (account.provider !== 'aws') return null
      const unencryptedBuckets = metrics.filter(
        (m) => m.resource_type === 's3_bucket' && m.metric_name === 'encryption_enabled' && m.value === 0,
      )
      if (!unencryptedBuckets.length) return null

      return {
        title: `${unencryptedBuckets.length} bucket(s) S3 sem criptografia`,
        description:
          `Buckets em "${account.account_name}" sem Server-Side Encryption ativa. ` +
          `Habilite SSE-S3 (AES-256) ou SSE-KMS para conformidade e proteção de dados.`,
        category: 'security',
        priority: 'high',
        estimated_savings_usd: null,
        ai_confidence: 0.99,
        resource_ids: unencryptedBuckets.map((m) => m.resource_id),
        metadata: { trigger: 's3_encryption', unencrypted_count: unencryptedBuckets.length },
      }
    },
  },

  // ── SUSTENTABILIDADE: Desligar instâncias ociosas à noite ────────────────
  {
    id: 'schedule_shutdown',
    name: 'Agendar desligamento noturno',
    evaluate({ account, metrics }) {
      const idleNightMetrics = metrics.filter(
        (m) =>
          m.resource_type === 'ec2_instance' &&
          m.metric_name === 'cpu_utilization_pct' &&
          m.value < 5,
      )
      if (!idleNightMetrics.length) return null

      const cost = account.monthly_cost_usd ?? 0
      const savings = cost * 0.30 * (idleNightMetrics.length / Math.max(metrics.length, 1))

      return {
        title: `Agendar desligamento para ${idleNightMetrics.length} instância(s) ociosa(s)`,
        description:
          `Instâncias em "${account.account_name}" com CPU < 5% consistentemente. ` +
          `Configurar Lambda Scheduler para desligar 14h/dia (21h–07h + fins de semana). ` +
          `Economia estimada: $${savings.toFixed(0)}/mês e -40% de emissões de CO₂.`,
        category: 'cost',
        priority: 'medium',
        estimated_savings_usd: Math.round(savings * 100) / 100,
        ai_confidence: 0.85,
        resource_ids: idleNightMetrics.map((m) => m.resource_id),
        metadata: { trigger: 'schedule_shutdown', idle_count: idleNightMetrics.length },
      }
    },
  },
]

// ─── Zod validation for rule output ──────────────────────────────────────────

const RuleResultSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['cost', 'performance', 'security', 'reliability']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  estimated_savings_usd: z.number().nullable(),
  ai_confidence: z.number().min(0).max(1),
  resource_ids: z.array(z.string()),
  metadata: z.record(z.unknown()),
})

// ─── Engine runner ────────────────────────────────────────────────────────────

export async function runRecommendationEngine(orgId: string): Promise<{ count: number; error: string | null }> {
  try {
    const [accountsRes, metricsRes, existingRes] = await Promise.all([
      supabase
        .from('cloud_accounts')
        .select('id, account_id, account_name, provider, status, monthly_cost_usd, last_sync_at')
        .eq('organization_id', orgId),
      supabase
        .from('metrics')
        .select('cloud_account_id, resource_id, resource_type, metric_name, value, unit, recorded_at')
        .in(
          'cloud_account_id',
          (
            await supabase
              .from('cloud_accounts')
              .select('id')
              .eq('organization_id', orgId)
          ).data?.map((a) => a.id as string) ?? [],
        )
        .gte('recorded_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
      supabase
        .from('recommendations')
        .select('cloud_account_id, metadata')
        .eq('organization_id', orgId)
        .eq('status', 'pending'),
    ])

    if (accountsRes.error) return { count: 0, error: accountsRes.error.message }

    const accounts = (accountsRes.data ?? []) as AccountRow[]
    const allMetrics = (metricsRes.data ?? []) as (MetricRow & { cloud_account_id: string })[]

    const existingKeys = new Set(
      (existingRes.data ?? []).map((r) => {
        const meta = r.metadata as Record<string, unknown>
        return `${String(r.cloud_account_id)}:${String(meta['trigger'] ?? '')}`
      }),
    )

    const toInsert: Omit<Recommendation, 'id' | 'created_at' | 'updated_at'>[] = []

    for (const account of accounts) {
      const metrics = allMetrics.filter((m) => m.cloud_account_id === account.id)
      const ctx: RuleContext = { account, metrics }

      for (const rule of RULES) {
        try {
          const raw = rule.evaluate(ctx)
          if (!raw) continue

          const parsed = RuleResultSchema.safeParse(raw)
          if (!parsed.success) continue

          const dedupeKey = `${account.id}:${String(parsed.data.metadata['trigger'] ?? '')}`
          if (existingKeys.has(dedupeKey)) continue

          toInsert.push({
            organization_id: orgId,
            cloud_account_id: account.id,
            status: 'pending',
            ...parsed.data,
          })
        } catch {
          // rule crash is isolated — continue
        }
      }
    }

    if (!toInsert.length) return { count: 0, error: null }

    const { error: insErr } = await supabase.from('recommendations').insert(toInsert)
    return { count: toInsert.length, error: insErr?.message ?? null }
  } catch (err) {
    return { count: 0, error: String(err) }
  }
}
