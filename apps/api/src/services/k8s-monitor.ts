import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import type { K8sNamespaceMetrics } from '@repo/types'

// ─── Kubecost API schema ──────────────────────────────────────────────────────

const KubecostAllocationSchema = z.record(
  z.object({
    name: z.string(),
    cpuCoreRequestAverage: z.number().optional(),
    cpuCoreUsageAverage: z.number().optional(),
    cpuCoreLimit: z.number().optional(),
    ramByteRequestAverage: z.number().optional(),
    ramByteUsageAverage: z.number().optional(),
    ramByteLimit: z.number().optional(),
    totalCost: z.number().optional(),
  }),
)

const KUBECOST_BASE_URL = process.env['KUBECOST_BASE_URL'] ?? 'http://localhost:9090'
const GB = 1_073_741_824 // bytes → GB

// ─── Fetch from Kubecost ──────────────────────────────────────────────────────

async function fetchKubecostAllocations(): Promise<z.infer<typeof KubecostAllocationSchema> | null> {
  try {
    const res = await fetch(
      `${KUBECOST_BASE_URL}/model/allocation?window=30d&aggregate=namespace&accumulate=true`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) return null
    const json = await res.json() as { data?: unknown[] }
    const raw = json.data?.[0]
    const parsed = KubecostAllocationSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

// ─── Transform Kubecost data to typed metrics ─────────────────────────────────

function toNamespaceMetrics(
  namespace: string,
  data: z.infer<typeof KubecostAllocationSchema>[string],
): K8sNamespaceMetrics {
  const cpuReq = data.cpuCoreRequestAverage ?? 0
  const cpuUsage = data.cpuCoreUsageAverage ?? 0
  const cpuLimit = data.cpuCoreLimit ?? 0
  const memReqBytes = data.ramByteRequestAverage ?? 0
  const memUsageBytes = data.ramByteUsageAverage ?? 0
  const memLimitBytes = data.ramByteLimit ?? 0
  const monthlyCost = data.totalCost ?? 0

  const efficiency =
    cpuReq > 0 ? Math.min(100, (cpuUsage / cpuReq) * 100) : 0

  return {
    namespace,
    cpu_request_cores: Math.round(cpuReq * 1000) / 1000,
    cpu_limit_cores: Math.round(cpuLimit * 1000) / 1000,
    cpu_usage_cores: Math.round(cpuUsage * 1000) / 1000,
    memory_request_gb: Math.round((memReqBytes / GB) * 1000) / 1000,
    memory_limit_gb: Math.round((memLimitBytes / GB) * 1000) / 1000,
    memory_usage_gb: Math.round((memUsageBytes / GB) * 1000) / 1000,
    monthly_cost_usd: Math.round(monthlyCost * 100) / 100,
    efficiency_pct: Math.round(efficiency * 10) / 10,
  }
}

// ─── Generate recommendations from K8s metrics ───────────────────────────────

function buildK8sRecommendations(
  metrics: K8sNamespaceMetrics[],
  orgId: string,
): Omit<{
  organization_id: string
  cloud_account_id: null
  category: string
  priority: string
  status: string
  title: string
  description: string
  estimated_savings_usd: number | null
  resource_ids: string[]
  ai_confidence: number
  metadata: Record<string, unknown>
}, 'id' | 'created_at' | 'updated_at'>[] {
  const recs = []

  for (const ns of metrics) {
    if (ns.efficiency_pct < 30 && ns.monthly_cost_usd > 50) {
      const savings = ns.monthly_cost_usd * (1 - ns.efficiency_pct / 100) * 0.5
      recs.push({
        organization_id: orgId,
        cloud_account_id: null,
        category: 'cost',
        priority: ns.monthly_cost_usd > 500 ? 'high' : 'medium',
        status: 'pending',
        title: `K8s: namespace "${ns.namespace}" com ${ns.efficiency_pct.toFixed(0)}% de eficiência`,
        description:
          `Namespace "${ns.namespace}" usa ${ns.cpu_usage_cores.toFixed(2)} cores de ${ns.cpu_request_cores.toFixed(2)} solicitados. ` +
          `Reduza as requests/limits para liberar recursos. Economia potencial: $${savings.toFixed(0)}/mês.`,
        estimated_savings_usd: Math.round(savings * 100) / 100,
        resource_ids: [`k8s-namespace-${ns.namespace}`],
        ai_confidence: 0.84,
        metadata: { trigger: 'k8s_low_efficiency', namespace: ns.namespace, efficiency_pct: ns.efficiency_pct },
      })
    }
  }

  return recs
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function syncK8sMetrics(orgId: string): Promise<{ namespaces: K8sNamespaceMetrics[]; error: string | null }> {
  try {
    const raw = await fetchKubecostAllocations()
    if (!raw) return { namespaces: [], error: 'Kubecost não disponível' }

    const namespaces = Object.entries(raw).map(([ns, data]) => toNamespaceMetrics(ns, data))

    const recs = buildK8sRecommendations(namespaces, orgId)
    if (recs.length) {
      await supabase.from('recommendations').upsert(recs, {
        onConflict: 'organization_id,title',
        ignoreDuplicates: true,
      })
    }

    return { namespaces, error: null }
  } catch (err) {
    return { namespaces: [], error: String(err) }
  }
}

export async function getK8sMetrics(orgId: string): Promise<K8sNamespaceMetrics[]> {
  // In production, store metrics in a dedicated table; here we always fetch live
  const { namespaces } = await syncK8sMetrics(orgId)
  return namespaces
}
