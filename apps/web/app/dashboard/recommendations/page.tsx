"use client"

import { useState } from "react"
import { Lightbulb, CheckCircle2, XCircle, Filter, ArrowRight, DollarSign } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

type Category = "rightsizing" | "idle" | "reservations" | "storage" | "networking"
type Priority = "critical" | "high" | "medium"
type RecStatus = "pending" | "applied" | "ignored"

interface Recommendation {
  id: string
  title: string
  description: string
  provider: "aws" | "gcp" | "azure"
  service: string
  category: Category
  priority: Priority
  saving: string
  savingRaw: number
  effort: "baixo" | "médio" | "alto"
  status: RecStatus
}

const RECS: Recommendation[] = [
  { id: "r1",  title: "Migrar instâncias para Graviton3",           description: "56 instâncias EC2 x86 elegíveis para ARM. Redução de até 30% no custo com performance igual ou superior.",   provider: "aws",   service: "EC2",              category: "rightsizing",  priority: "critical", saving: "R$ 85.000/mês",  savingRaw: 85000,  effort: "médio" , status: "pending" },
  { id: "r2",  title: "Redimensionar VMs subutilizadas",            description: "12 VMs no Azure com CPU médio < 5%. Downgrade de SKU sem impacto de produção confirmado por 90 dias de métricas.", provider: "azure", service: "Virtual Machines", category: "rightsizing",  priority: "high",     saving: "R$ 22.400/mês",  savingRaw: 22400,  effort: "baixo",  status: "pending" },
  { id: "r3",  title: "Reservar capacidade GKE (1 ano)",            description: "Cluster com carga previsível nos últimos 90 dias. Committed Use Discount de 1 ano gera economia significativa.",    provider: "gcp",   service: "GKE",              category: "reservations", priority: "high",     saving: "R$ 41.600/mês",  savingRaw: 41600,  effort: "baixo",  status: "pending" },
  { id: "r4",  title: "Desligar instâncias idle fora do horário",   description: "23 instâncias de dev/test com 0% de tráfego entre 20h e 8h. Schedule de start/stop pode reduzir horas ativas.",    provider: "aws",   service: "EC2",              category: "idle",         priority: "high",     saving: "R$ 18.900/mês",  savingRaw: 18900,  effort: "baixo",  status: "pending" },
  { id: "r5",  title: "Deletar snapshots EBS com mais de 180 dias", description: "487 snapshots sem uso ativo acumulando custo. Lifecycle policy automatizada pode eliminar 95% deles.",              provider: "aws",   service: "EBS",              category: "storage",      priority: "medium",   saving: "R$ 7.200/mês",   savingRaw: 7200,   effort: "baixo",  status: "pending" },
  { id: "r6",  title: "Otimizar Cloud Storage com Nearline",        description: "3.8 TB em Standard Storage acessados menos de 1x/mês. Migração para Nearline reduz custo de armazenamento em 70%.", provider: "gcp",   service: "Cloud Storage",    category: "storage",      priority: "medium",   saving: "R$ 4.800/mês",   savingRaw: 4800,   effort: "baixo",  status: "pending" },
  { id: "r7",  title: "Consolidar NAT Gateways por AZ",             description: "6 NAT Gateways com tráfego combinado que cabe em 2. Consolidação reduz custo fixo mensal de gateways ociosos.",     provider: "aws",   service: "VPC",              category: "networking",   priority: "medium",   saving: "R$ 3.100/mês",   savingRaw: 3100,   effort: "médio",  status: "pending" },
  { id: "r8",  title: "Reserved Instances RDS (3 anos)",            description: "Banco de dados RDS com workload estável há 18 meses. Reserva de 3 anos com pagamento adiantado = 60% de desconto.", provider: "aws",   service: "RDS",              category: "reservations", priority: "critical", saving: "R$ 67.000/mês",  savingRaw: 67000,  effort: "baixo",  status: "applied"  },
  { id: "r9",  title: "Remover discos não conectados",              description: "34 Managed Disks no Azure sem VM associada. Remoção imediata sem risco de perda de dados.",                         provider: "azure", service: "Disk Storage",     category: "idle",         priority: "medium",   saving: "R$ 2.900/mês",   savingRaw: 2900,   effort: "baixo",  status: "ignored"  },
]

const CATEGORY_META: Record<Category, { label: string }> = {
  rightsizing:  { label: "Rightsizing"          },
  idle:         { label: "Recursos ociosos"     },
  reservations: { label: "Reservas / CUD"       },
  storage:      { label: "Armazenamento"        },
  networking:   { label: "Rede"                 },
}

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  critical: { label: "Crítico", color: "text-danger",  bg: "bg-danger/10"  },
  high:     { label: "Alto",    color: "text-warning", bg: "bg-warning/10" },
  medium:   { label: "Médio",   color: "text-chart-2", bg: "bg-chart-2/10" },
}

const STATUS_META: Record<RecStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "text-muted-foreground" },
  applied: { label: "Aplicado", color: "text-success"          },
  ignored: { label: "Ignorado", color: "text-muted-foreground/50" },
}

interface ToastMsg { id: number; text: string }

export default function RecommendationsPage() {
  const [recs, setRecs]             = useState<Recommendation[]>(RECS)
  const [categoryFilter, setCat]    = useState<Category | "all">("all")
  const [providerFilter, setProv]   = useState<"all" | "aws" | "gcp" | "azure">("all")
  const [statusFilter, setStatus]   = useState<RecStatus | "all">("pending")
  const [toasts, setToasts]         = useState<ToastMsg[]>([])

  function addToast(text: string) {
    const id = Date.now()
    setToasts((t) => [...t.slice(-3), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  function apply(id: string) {
    setRecs((r) => r.map((x) => x.id === id ? { ...x, status: "applied" as const } : x))
    addToast("Recomendação marcada como aplicada.")
  }

  function ignore(id: string) {
    setRecs((r) => r.map((x) => x.id === id ? { ...x, status: "ignored" as const } : x))
    addToast("Recomendação ignorada.")
  }

  const filtered = recs.filter((r) => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false
    if (providerFilter !== "all" && r.provider !== providerFilter) return false
    if (statusFilter   !== "all" && r.status   !== statusFilter)   return false
    return true
  })

  const pendingSaving = recs
    .filter((r) => r.status === "pending")
    .reduce((acc, r) => acc + r.savingRaw, 0)

  const appliedSaving = recs
    .filter((r) => r.status === "applied")
    .reduce((acc, r) => acc + r.savingRaw, 0)

  function fmt(n: number) {
    return `R$ ${(n / 1000).toFixed(0)}K`
  }

  return (
    <DashboardShell title="Recomendações" breadcrumb="Dashboard / Recomendações" onToast={addToast}>
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Economia Pendente",  value: fmt(pendingSaving), color: "text-warning"  },
            { label: "Já Economizado",     value: fmt(appliedSaving), color: "text-success"  },
            { label: "Recomendações",      value: recs.filter((r) => r.status === "pending").length, color: "text-foreground" },
            { label: "Aplicadas",          value: recs.filter((r) => r.status === "applied").length, color: "text-success"  },
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

          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(["all", "pending", "applied", "ignored"] as const).map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${statusFilter === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {s === "all" ? "Todas" : STATUS_META[s].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(["all", "rightsizing", "idle", "reservations", "storage", "networking"] as const).map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${categoryFilter === c ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {c === "all" ? "Todas" : CATEGORY_META[c].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(["all", "aws", "gcp", "azure"] as const).map((p) => (
              <button key={p} onClick={() => setProv(p)}
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
              <Lightbulb className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma recomendação encontrada</p>
              <p className="text-xs text-muted-foreground/60">Ajuste os filtros para ver mais resultados.</p>
            </div>
          )}

          {filtered.map((rec, i) => {
            const pri    = PRIORITY_META[rec.priority]
            const isPending = rec.status === "pending"
            const isApplied = rec.status === "applied"
            return (
              <div
                key={rec.id}
                className={`card-enter rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-[oklch(1_0_0/0.12)] ${!isPending ? "opacity-60" : ""}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 size-8 rounded-lg ${pri.bg} flex items-center justify-center shrink-0`}>
                      {isApplied
                        ? <CheckCircle2 className="size-4 text-success" />
                        : <Lightbulb    className={`size-4 ${pri.color}`} />
                      }
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-foreground">{rec.title}</h3>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${pri.bg} ${pri.color}`}>
                          {pri.label}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                          {CATEGORY_META[rec.category].label}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                          {rec.provider.toUpperCase()} · {rec.service}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                      <div className="flex items-center gap-3 pt-0.5">
                        <span className="flex items-center gap-1 text-xs text-success font-semibold">
                          <DollarSign className="size-3" />
                          {rec.saving}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Esforço: <span className="text-foreground">{rec.effort}</span>
                        </span>
                        <span className={`text-xs font-medium ${STATUS_META[rec.status].color}`}>
                          {STATUS_META[rec.status].label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => ignore(rec.id)}
                        className="size-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-danger hover:border-danger/30 hover:bg-danger/10 transition-all duration-150">
                        <XCircle className="size-4" />
                      </button>
                      <button onClick={() => apply(rec.id)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-success/30 bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-all duration-150">
                        Aplicar
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

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
