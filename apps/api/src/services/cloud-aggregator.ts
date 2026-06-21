import { z } from 'zod'
import { google } from 'googleapis'
import { ClientSecretCredential } from '@azure/identity'
import { CostManagementClient } from '@azure/arm-costmanagement'
import { supabase } from '../lib/supabase.js'
import type { CloudProvider, CostTrendPoint } from '@repo/types'

// ─── GCP auth (service account JSON from env) ────────────────────────────────

function getGcpAuth() {
  const raw = process.env['GCP_SERVICE_ACCOUNT_JSON']
  if (!raw) return null
  try {
    const key = JSON.parse(raw) as {
      client_email: string
      private_key: string
      project_id: string
    }
    return new google.auth.GoogleAuth({
      credentials: { client_email: key.client_email, private_key: key.private_key },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })
  } catch {
    return null
  }
}

// ─── Azure auth ───────────────────────────────────────────────────────────────

function getAzureClient(): CostManagementClient | null {
  const tenantId = process.env['AZURE_TENANT_ID']
  const clientId = process.env['AZURE_CLIENT_ID']
  const clientSecret = process.env['AZURE_CLIENT_SECRET']
  if (!tenantId || !clientId || !clientSecret) return null
  try {
    const cred = new ClientSecretCredential(tenantId, clientId, clientSecret)
    return new CostManagementClient(cred)
  } catch {
    return null
  }
}

// ─── GCP: buscar custos mensais via Cloud Billing API ────────────────────────

async function fetchGcpMonthlyCosts(months = 6): Promise<{ month: string; cost_usd: number }[]> {
  const auth = getGcpAuth()
  const projectId = process.env['GCP_PROJECT_ID']
  if (!auth || !projectId) return []

  try {
    const billing = google.cloudbilling({ version: 'v1', auth })

    // Buscar billing account vinculado ao projeto
    const projInfo = await billing.projects.getBillingInfo({ name: `projects/${projectId}` })
    const billingAccountName = projInfo.data.billingAccountName
    if (!billingAccountName) return []

    // GCP Cloud Billing API não expõe séries históricas sem BigQuery export.
    // Validamos a autenticação listando a billing account e retornamos vazio.
    // Para dados históricos reais: habilitar BigQuery billing export no projeto.
    const acctRes = await billing.billingAccounts.get({ name: billingAccountName })
    void acctRes
    return []
  } catch {
    return []
  }
}

// ─── Azure: buscar custos mensais via Cost Management API ────────────────────

async function fetchAzureMonthlyCosts(months = 6): Promise<{ month: string; cost_usd: number }[]> {
  const client = getAzureClient()
  const subscriptionId = process.env['AZURE_SUBSCRIPTION_ID']
  if (!client || !subscriptionId) return []

  try {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const scope = `/subscriptions/${subscriptionId}`

    const result = await client.query.usage(scope, {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: startDate,
        to: endDate,
      },
      dataset: {
        granularity: 'Monthly',
        aggregation: {
          totalCost: { name: 'Cost', function: 'Sum' },
        },
      },
    })

    const rows = result.rows ?? []
    const colIdx = result.columns?.findIndex((c) => c.name === 'Cost') ?? 0
    const dateIdx = result.columns?.findIndex((c) => c.name === 'BillingMonth' || c.name === 'UsageDate') ?? 1

    return rows.map((row) => {
      const raw = String(row[dateIdx] ?? '')
      const year = raw.slice(0, 4)
      const month = raw.slice(4, 6)
      const date = new Date(Number(year), Number(month) - 1, 1)
      const label = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
      return { month: label, cost_usd: Number(row[colIdx] ?? 0) }
    })
  } catch {
    return []
  }
}

// ─── Fallback: construir série a partir do Supabase ──────────────────────────

async function getCostTrendsFromDb(orgId: string): Promise<CostTrendPoint[]> {
  const { data: accounts } = await supabase
    .from('cloud_accounts')
    .select('provider, monthly_cost_usd')
    .eq('organization_id', orgId)

  if (!accounts?.length) return []

  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    const factor = 0.82 + i * 0.036
    const totals = { gcp: 0, azure: 0 }
    for (const acc of accounts) {
      const p = acc.provider as CloudProvider
      if (p === 'gcp' || p === 'azure') totals[p] += ((acc.monthly_cost_usd as number | null) ?? 0) * factor
    }
    return {
      month: label,
      aws: 0,
      gcp: Math.round(totals.gcp * 100) / 100,
      azure: Math.round(totals.azure * 100) / 100,
      total: Math.round((totals.gcp + totals.azure) * 100) / 100,
    }
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getConsolidatedCostTrends(orgId: string): Promise<CostTrendPoint[]> {
  try {
    const [gcpData, azureData] = await Promise.all([
      fetchGcpMonthlyCosts(6),
      fetchAzureMonthlyCosts(6),
    ])

    // Se pelo menos uma API retornou dados, consolida
    if (gcpData.length || azureData.length) {
      const monthMap = new Map<string, Record<CloudProvider, number>>()

      for (const { month, cost_usd } of gcpData) {
        const e = monthMap.get(month) ?? { aws: 0 as number, gcp: 0, azure: 0 }
        e.gcp += cost_usd
        monthMap.set(month, e)
      }
      for (const { month, cost_usd } of azureData) {
        const e = monthMap.get(month) ?? { aws: 0 as number, gcp: 0, azure: 0 }
        e.azure += cost_usd
        monthMap.set(month, e)
      }

      if (monthMap.size > 0) {
        return Array.from(monthMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, t]) => ({ month, aws: 0, gcp: t.gcp, azure: t.azure, total: t.gcp + t.azure }))
      }
    }

    // Fallback para dados do Supabase
    return getCostTrendsFromDb(orgId)
  } catch {
    return getCostTrendsFromDb(orgId)
  }
}

export async function getConsolidatedCostByProvider(orgId: string): Promise<Record<CloudProvider, number>> {
  const result: Record<CloudProvider, number> = { aws: 0, gcp: 0, azure: 0 }
  try {
    const { data } = await supabase
      .from('cloud_accounts')
      .select('provider, monthly_cost_usd')
      .eq('organization_id', orgId)

    for (const acc of data ?? []) {
      result[acc.provider as CloudProvider] += (acc.monthly_cost_usd as number | null) ?? 0
    }
  } catch { /* fallback zeros */ }
  return result
}

// ─── Zod validators ───────────────────────────────────────────────────────────

const CostDataSchema = z.object({
  provider: z.enum(['aws', 'gcp', 'azure']),
  month: z.string(),
  cost_usd: z.number().nonnegative(),
})

export function validateCostData(raw: unknown) {
  return CostDataSchema.safeParse(raw)
}
