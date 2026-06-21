"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Lightbulb, CheckCircle2, XCircle, Filter, DollarSign, RefreshCw } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import type { Recommendation, RecommendationStatus } from "@repo/types"

type FilterOption = "all" | "pending" | "applied" | "dismissed"

const PRIORITY_CFG = {
  critical: { label: "Crítico", cls: "bg-danger/10 text-danger"     },
  high:     { label: "Alto",    cls: "bg-warning/10 text-warning"    },
  medium:   { label: "Médio",   cls: "bg-chart-2/10 text-chart-2"   },
  low:      { label: "Baixo",   cls: "bg-muted text-muted-foreground"},
}

function fmtUSD(n: number | null): string {
  if (!n) return "—"
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

interface Toast { id: number; text: string }

export default function RecommendationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterOption>("all")
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    if (!authLoading && !user) router.push("/login")
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiFetch<Recommendation[]>("/api/recommendations/").then((data) => {
      if (data === null) addToast("Erro ao carregar recomendações. Verifique sua conexão.")
      setRecs(data ?? [])
      setLoading(false)
    })
  }, [user])

  function addToast(text: string) {
    const id = Date.now()
    setToasts((t) => [...t.slice(-3), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  async function updateStatus(id: string, status: RecommendationStatus) {
    const result = await apiFetch(`/api/recommendations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
    if (result !== null) {
      setRecs((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
      const labels: Record<string, string> = { applied: "aplicada", dismissed: "descartada", pending: "reaberta" }
      addToast(`Recomendação ${labels[status] ?? status}.`)
    }
  }

  const filtered = filter === "all" ? recs : recs.filter((r) => r.status === filter)

  const totalSavings = recs
    .filter((r) => r.status === "pending" || r.status === "in_progress")
    .reduce((s, r) => s + (r.estimated_savings_usd ?? 0), 0)

  if (authLoading) return null

  return (
    <DashboardShell title="Recomendações" breadcrumb="Dashboard / Recomendações">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["pending", "applied", "dismissed", "in_progress"] as const).map((s) => {
            const count = recs.filter((r) => r.status === s).length
            const labels: Record<string, string> = { pending: "Pendentes", applied: "Aplicadas", dismissed: "Descartadas", in_progress: "Em andamento" }
            return (
              <div key={s} className="rounded-xl border border-border bg-card p-4 card-enter">
                <p className="text-xs text-muted-foreground mb-1">{labels[s]}</p>
                <p className="text-2xl font-semibold text-foreground">{count}</p>
              </div>
            )
          })}
        </div>

        {totalSavings > 0 && (
          <div className="rounded-xl border border-border bg-success/5 p-4 flex items-center gap-3 card-enter">
            <DollarSign className="size-5 text-success shrink-0" />
            <p className="text-sm text-foreground">
              Economia potencial identificada:{" "}
              <span className="font-semibold text-success">{fmtUSD(totalSavings)}/mês</span>
            </p>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="size-3.5 text-muted-foreground shrink-0" />
          {(["all", "pending", "applied", "dismissed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {{ all: "Todas", pending: "Pendentes", applied: "Aplicadas", dismissed: "Descartadas" }[f]}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center gap-3 text-center card-enter">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center">
              <Lightbulb className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma recomendação encontrada</p>
            <p className="text-xs text-muted-foreground">Quando houver oportunidades de otimização, elas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden card-enter">
            {filtered.map((r) => {
              const prio = PRIORITY_CFG[r.priority] ?? PRIORITY_CFG.low
              return (
                <div key={r.id} className="flex items-start gap-4 px-5 py-4 hover:bg-accent/50 transition-colors duration-150">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${prio.cls}`}>{prio.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                    {r.estimated_savings_usd && (
                      <p className="text-xs font-medium text-success">
                        Economia estimada: {fmtUSD(r.estimated_savings_usd)}/mês
                      </p>
                    )}
                  </div>
                  {r.status === "pending" || r.status === "in_progress" ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateStatus(r.id, "applied")}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium text-success bg-success/10 hover:bg-success/20 transition-all duration-150"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Aplicar
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, "dismissed")}
                        className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all duration-150"
                      >
                        <XCircle className="size-4" />
                      </button>
                    </div>
                  ) : r.status === "applied" ? (
                    <span className="flex items-center gap-1 text-xs text-success shrink-0">
                      <CheckCircle2 className="size-3.5" />
                      Aplicada
                    </span>
                  ) : (
                    <button
                      onClick={() => updateStatus(r.id, "pending")}
                      className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium text-muted-foreground bg-muted hover:bg-accent transition-all duration-150 shrink-0"
                    >
                      <RefreshCw className="size-3.5" />
                      Reabrir
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="card-enter pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg text-sm text-foreground min-w-64">
            <span className="size-2 rounded-full bg-success shrink-0" />
            {t.text}
          </div>
        ))}
      </div>
    </DashboardShell>
  )
}
