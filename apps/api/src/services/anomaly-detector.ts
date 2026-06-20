import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import type { Anomaly, AnomalySeverity, CloudProvider } from '@repo/types'

const ANOMALY_THRESHOLD = { warning: 0.30, critical: 0.60 } // 30% / 60% deviation

// ─── Zod schema for stored anomalies ─────────────────────────────────────────

const AnomalyInsertSchema = z.object({
  organization_id: z.string().uuid(),
  cloud_account_id: z.string().uuid().nullable(),
  provider: z.enum(['aws', 'gcp', 'azure']),
  resource_id: z.string().min(1),
  resource_type: z.string().min(1),
  severity: z.enum(['critical', 'warning', 'info']),
  title: z.string().min(1),
  description: z.string().min(1),
  expected_cost_usd: z.number().nonnegative(),
  actual_cost_usd: z.number().nonnegative(),
  deviation_pct: z.number(),
  metadata: z.record(z.unknown()).default({}),
})

type AnomalyInsert = z.infer<typeof AnomalyInsertSchema>

// ─── Detection logic ──────────────────────────────────────────────────────────

function classifySeverity(deviationPct: number): AnomalySeverity {
  if (deviationPct >= ANOMALY_THRESHOLD.critical * 100) return 'critical'
  if (deviationPct >= ANOMALY_THRESHOLD.warning * 100) return 'warning'
  return 'info'
}

function buildAnomalyTitle(provider: CloudProvider, resourceType: string, deviationPct: number): string {
  return `Spike de custo em ${provider.toUpperCase()} ${resourceType} (+${deviationPct.toFixed(0)}%)`
}

function buildAnomalyDescription(
  accountName: string,
  resourceType: string,
  expected: number,
  actual: number,
): string {
  return (
    `Conta "${accountName}" apresentou custo de $${actual.toFixed(2)} em ${resourceType}, ` +
    `contra o esperado de $${expected.toFixed(2)}. ` +
    `Verifique instâncias ociosas ou provisionamento excessivo.`
  )
}

// ─── Detect anomalies from account cost data ──────────────────────────────────

interface AccountRow {
  id: string
  account_id: string
  account_name: string
  provider: string
  monthly_cost_usd: number | null
}

function detectFromAccount(
  account: AccountRow,
  orgId: string,
  baselineCost: number,
): AnomalyInsert | null {
  const actual = account.monthly_cost_usd ?? 0
  if (baselineCost === 0 || actual === 0) return null

  const deviation = (actual - baselineCost) / baselineCost
  if (deviation < ANOMALY_THRESHOLD.warning) return null

  const deviationPct = deviation * 100
  const provider = account.provider as CloudProvider
  const severity = classifySeverity(deviationPct)

  const raw = {
    organization_id: orgId,
    cloud_account_id: account.id,
    provider,
    resource_id: account.account_id,
    resource_type: 'cloud_account',
    severity,
    title: buildAnomalyTitle(provider, 'conta', deviationPct),
    description: buildAnomalyDescription(account.account_name, 'geral', baselineCost, actual),
    expected_cost_usd: baselineCost,
    actual_cost_usd: actual,
    deviation_pct: deviationPct,
    metadata: { trigger: 'cost_spike', account_id: account.account_id },
  }

  const parsed = AnomalyInsertSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

// ─── Store critical anomalies + optional email alert ─────────────────────────

async function persistAnomalies(anomalies: AnomalyInsert[]): Promise<void> {
  if (!anomalies.length) return
  await supabase.from('anomalies').upsert(
    anomalies.map((a) => ({
      ...a,
      detected_at: new Date().toISOString(),
      resolved_at: null,
    })),
    { onConflict: 'organization_id,resource_id,provider', ignoreDuplicates: true }
  )
}

async function sendCriticalAlert(orgId: string, anomaly: AnomalyInsert): Promise<void> {
  // Placeholder: integrate with Resend / SendGrid / Supabase Edge Function
  // Only called for severity === 'critical'
  console.error(`[ALERT] Critical anomaly for org ${orgId}: ${anomaly.title}`)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function detectAndPersistAnomalies(orgId: string): Promise<{ count: number; error: string | null }> {
  try {
    const { data: accounts, error } = await supabase
      .from('cloud_accounts')
      .select('id, account_id, account_name, provider, monthly_cost_usd')
      .eq('organization_id', orgId)
      .eq('status', 'active')

    if (error) return { count: 0, error: error.message }
    if (!accounts?.length) return { count: 0, error: null }

    // Baseline: average across all accounts for each provider
    const providerCosts: Record<string, number[]> = {}
    for (const acc of accounts as AccountRow[]) {
      const p = acc.provider
      if (!providerCosts[p]) providerCosts[p] = []
      if (acc.monthly_cost_usd) providerCosts[p]!.push(acc.monthly_cost_usd)
    }

    const providerBaseline: Record<string, number> = {}
    for (const [p, costs] of Object.entries(providerCosts)) {
      providerBaseline[p] = costs.reduce((s, v) => s + v, 0) / costs.length
    }

    const detected: AnomalyInsert[] = []
    for (const acc of accounts as AccountRow[]) {
      const baseline = providerBaseline[acc.provider] ?? 0
      const anomaly = detectFromAccount(acc, orgId, baseline * 0.7)
      if (anomaly) {
        detected.push(anomaly)
        if (anomaly.severity === 'critical') {
          await sendCriticalAlert(orgId, anomaly)
        }
      }
    }

    await persistAnomalies(detected)
    return { count: detected.length, error: null }
  } catch (err) {
    return { count: 0, error: String(err) }
  }
}

export async function getRecentAnomalies(orgId: string, hours = 24): Promise<Anomaly[]> {
  try {
    const since = new Date(Date.now() - hours * 3_600_000).toISOString()
    const { data, error } = await supabase
      .from('anomalies')
      .select('*')
      .eq('organization_id', orgId)
      .gte('detected_at', since)
      .is('resolved_at', null)
      .order('detected_at', { ascending: false })

    if (error) return []
    return (data ?? []) as Anomaly[]
  } catch {
    return []
  }
}
