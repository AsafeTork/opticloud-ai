"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Filter, TrendingUp, Zap } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

type Severity = "critical" | "high" | "medium" | "low"
type AnomalyStatus = "open" | "resolved"
type Provider = "all" | "aws" | "gcp" | "azure"

interface Anomaly {
  id: string
  title: string
  description: string
  provider: "aws" | "gcp" | "azure"
  service: string
  delta: number
  severity: Severity
  status: AnomalyStatus
  time: string
  date: string
}

const ANOMALIES: Anomaly[] = [
  { id: "a1",  title: "Pico de egress na região us-east-1",     description: "Transferência de dados 340% acima da média histórica. Possível exfiltração ou misconfiguration de CDN.",      provider: "aws",   service: "EC2",           delta: 340, severity: "critical", status: "open",     time: "há 12 min",  date: "20 Jun 2025" },
  { id: "a2",  title: "BigQuery jobs acima do budget diário",   description: "Jobs de ETL consumiram 87% a mais que o esperado. Possível loop de reprocessamento ou query sem filtro.",       provider: "gcp",   service: "BigQuery",      delta: 87,  severity: "high",     status: "open",     time: "há 1 h",     date: "20 Jun 2025" },
  { id: "a3",  title: "Azure Functions com CPU elevada",         description: "12 instâncias de Function App rodando com CPU > 90% por mais de 45 minutos. Pode indicar memory leak.",         provider: "azure", service: "Functions",     delta: 52,  severity: "medium",   status: "open",     time: "há 3 h",     date: "20 Jun 2025" },
  { id: "a4",  title: "S3 requests inesperados",                description: "1,2M de GET requests em bucket privado fora do horário de pico. Verificar permissões de bucket policy.",        provider: "aws",   service: "S3",            delta: 210, severity: "high",     status: "open",     time: "há 4 h",     date: "20 Jun 2025" },
  { id: "a5",  title: "GKE node pool scaling descontrolado",    description: "Cluster escalou de 8 para 34 nodes em 20 minutos. HPA pode estar respondendo a métricas incorretas.",           provider: "gcp",   service: "GKE",           delta: 320, severity: "critical", status: "open",     time: "há 6 h",     date: "20 Jun 2025" },
  { id: "a6",  title: "RDS Multi-AZ failover inesperado",       description: "Banco de dados fez failover duas vezes nas últimas 4 horas. Latência de storage acima do threshold.",            provider: "aws",   service: "RDS",           delta: 45,  severity: "medium",   status: "open",     time: "há 8 h",     date: "20 Jun 2025" },
  { id: "a7",  title: "Cosmos DB RU/s acima do limite",         description: "Throughput provisionado esgotado em 3 collections. Requisições sendo throttled — possível impacto em usuários.", provider: "azure", service: "Cosmos DB",     delta: 180, severity: "high",     status: "open",     time: "há 9 h",     date: "20 Jun 2025" },
  { id: "a8",  title: "Lambda timeout em massa",                description: "42% das invocações Lambda na função de pagamentos estão fazendo timeout. Downstream dependency indisponível.",  provider: "aws",   service: "Lambda",        delta: 420, severity: "critical", status: "resolved", time: "há 14 h",    date: "19 Jun 2025" },
  { id: "a9",  title: "Cloud Storage billing spike",            description: "Custo de armazenamento aumentou R$ 12k em 6h. Bucket sem lifecycle policy recebendo objetos sem TTL.",         provider: "gcp",   service: "Cloud Storage", delta: 95,  severity: "high",     status: "resolved", time: "há 1 dia",   date: "19 Jun 2025" },
  { id: "a10", title: "Azure Blob Storage latência elevada",    description: "Latência de leitura 3x acima do P99 esperado. Zona de disponibilidade com degradação de rede reportada.",      provider: "azure", service: "Blob Storage",  delta: 30,  severity: "low",      status: "resolved", time: "há 2 dias",  date: "18 Jun 2025" },
]

const SEVERITY_META: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: "Crítico", color: "text-danger",   bg: "bg-danger/10",   border: "border-danger/20"  },
  high:     { label: "Alto",    color: "text-warning",  bg: "bg-warning/10",  border: "border-warning/20" },
  medium:   { label: "Médio",   color: "text-chart-4",  bg: "bg-chart-4/10",  border: "border-chart-4/20" },
  low:      { label: "Baixo",   color: "text-chart-2",  bg: "bg-chart-2/10",  border: "border-chart-2/20" },
}

interface ToastMsg { id: number; text: string }

export default function AnomaliesPage() {
  const [anomalies, setAnomalies]           = useState<Anomaly[]>(ANOMALIES)
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all")
  const [providerFilter, setProviderFilter] = useState<Provider>("all")
  const [statusFilter, setStatusFilter]     = useState<AnomalyStatus | "all">("open")
  const [toasts, setToasts]                 = useState<ToastMsg[]>([])

  function addToast(text: string) {
    const id = Date.now()
    setToasts((t) => [...t.slice(-3), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  function resolve(id: string) {
    setAnomalies((a) => a.map((x) => x.id === id ? { ...x, status: "resolved" as const } : x))
    addToast("Anomalia marcada como resolvida.")
  }

  const filtered = anomalies.filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false
    if (providerFilter !== "all" && a.provider !== providerFilter) return false
    if (statusFilter   !== "all" && a.status   !== statusFilter)   return false
    return true
  })

  const openCount     = anomalies.filter((a) => a.status === "open").length
  const criticalCount = anomalies.filter((a) => a.severity === "critical" && a.status === "open").length

  return (
    <DashboardShell title="Anomalias" breadcrumb="Dashboard / Anomalias" onToast={addToast}>
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Anomalias Abertas",   value: openCount,     color: "text-danger"   },
            { label: "Críticas",            value: criticalCount, color: "text-danger"   },
            { label: "Altas",               value: anomalies.filter((a) => a.severity === "high"   && a.status === "open").length, color: "text-warning"  },
            { label: "Resolvidas (total)",  value: anomalies.filter((a) => a.status === "resolved").length, color: "text-success"  },
          ].map((s) => (
            <div key={s.label} className="card-enter rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="size-4 text-muted-foreground shrink-0" />

          {/* Status */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(["all", "open", "resolved"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${statusFilter === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {s === "all" ? "Todos" : s === "open" ? "Abertos" : "Resolvidos"}
              </button>
            ))}
          </div>

          {/* Severity */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
              <button key={s} onClick={() => setSeverityFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${severityFilter === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {s === "all" ? "Todos" : SEVERITY_META[s].label}
              </button>
            ))}
          </div>

          {/* Provider */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(["all", "aws", "gcp", "azure"] as const).map((p) => (
              <button key={p} onClick={() => setProviderFilter(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${providerFilter === p ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {p === "all" ? "Todos" : p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-border bg-card text-center">
              <CheckCircle2 className="size-10 text-success/40" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma anomalia encontrada</p>
              <p className="text-xs text-muted-foreground/60">Tente ajustar os filtros.</p>
            </div>
          )}

          {filtered.map((anomaly, i) => {
            const sev = SEVERITY_META[anomaly.severity]
            const isResolved = anomaly.status === "resolved"
            return (
              <div
                key={anomaly.id}
                className={`card-enter rounded-xl border bg-card p-4 transition-all duration-150 hover:border-[oklch(1_0_0/0.12)] ${isResolved ? "border-border opacity-60" : `border-border ${sev.border}`}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 size-8 rounded-lg ${sev.bg} flex items-center justify-center shrink-0`}>
                      {isResolved
                        ? <CheckCircle2 className={`size-4 text-success`} />
                        : <AlertTriangle className={`size-4 ${sev.color}`} />
                      }
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-medium ${isResolved ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {anomaly.title}
                        </h3>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${sev.bg} ${sev.color}`}>
                          {sev.label}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                          {anomaly.provider.toUpperCase()} · {anomaly.service}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{anomaly.description}</p>
                      <div className="flex items-center gap-3 pt-0.5">
                        <span className="flex items-center gap-1 text-xs text-danger font-medium">
                          <TrendingUp className="size-3" />
                          +{anomaly.delta}% vs. média
                        </span>
                        <span className="text-xs text-muted-foreground">{anomaly.time}</span>
                        <span className="text-xs text-muted-foreground">{anomaly.date}</span>
                      </div>
                    </div>
                  </div>

                  {!isResolved && (
                    <button
                      onClick={() => resolve(anomaly.id)}
                      className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg border border-success/30 bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-all duration-150"
                    >
                      <Zap className="size-3.5" />
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Toasts */}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="card-enter pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg text-sm text-foreground min-w-64">
            <span className="size-2 rounded-full bg-success shrink-0" aria-hidden="true" />
            {t.text}
          </div>
        ))}
      </div>
    </DashboardShell>
  )
}
