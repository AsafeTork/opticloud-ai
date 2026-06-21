"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Filter, TrendingUp, Zap } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import type { Anomaly } from "@repo/types"

type Filter = "all" | "critical" | "warning" | "info"

const SEV_CFG = {
  critical: { label: "Crítico", dot: "bg-danger",    badge: "bg-danger/10 text-danger",    text: "text-danger"   },
  warning:  { label: "Alto",    dot: "bg-warning",   badge: "bg-warning/10 text-warning",  text: "text-warning"  },
  info:     { label: "Médio",   dot: "bg-chart-2",   badge: "bg-chart-2/10 text-chart-2",  text: "text-chart-2"  },
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "agora mesmo"
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  return `há ${Math.floor(diff / 86400)} d`
}

export default function AnomaliesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [filter, setFilter] = useState<Filter>("all")

  useEffect(() => {
    if (!authLoading && !user) router.push("/login")
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiFetch<Anomaly[]>("/api/dashboard/anomalies").then((data) => {
      if (data === null) setFetchError(true)
      setAnomalies(data ?? [])
      setLoading(false)
    })
  }, [user])

  const filtered = filter === "all" ? anomalies : anomalies.filter((a) => a.severity === filter)

  const counts = {
    critical: anomalies.filter((a) => a.severity === "critical").length,
    warning:  anomalies.filter((a) => a.severity === "warning").length,
    info:     anomalies.filter((a) => a.severity === "info").length,
  }

  if (authLoading) return null

  return (
    <DashboardShell title="Anomalias" breadcrumb="Dashboard / Anomalias">
      <div className="space-y-4">
        {fetchError && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
            <AlertTriangle className="size-4 shrink-0" />
            Erro ao carregar anomalias. Os dados podem estar desatualizados.
          </div>
        )}
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {(["critical", "warning", "info"] as const).map((s) => {
            const cfg = SEV_CFG[s]
            return (
              <div key={s} className="rounded-xl border border-border bg-card p-4 card-enter">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`size-2 rounded-full ${cfg.dot}`} />
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                </div>
                <p className={`text-2xl font-semibold ${cfg.text}`}>{counts[s]}</p>
              </div>
            )
          })}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="size-3.5 text-muted-foreground shrink-0" />
          {(["all", "critical", "warning", "info"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Todas" : SEV_CFG[f].label}
              {f !== "all" && ` (${counts[f]})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center gap-3 text-center card-enter">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="size-6 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma anomalia detectada</p>
            <p className="text-xs text-muted-foreground">Seus custos estão dentro dos padrões esperados.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden card-enter">
            {filtered.map((a) => {
              const cfg = SEV_CFG[a.severity] ?? SEV_CFG.info
              return (
                <div key={a.id} className="flex items-start gap-3 px-5 py-4 hover:bg-accent/50 transition-colors duration-150">
                  <span className={`mt-1.5 size-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.provider.toUpperCase()} · {a.resource_type} · {relativeTime(a.detected_at)}
                    </p>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`flex items-center gap-1 text-xs font-medium ${cfg.text}`}>
                      <TrendingUp className="size-3" />
                      +{Math.round(a.deviation_pct)}%
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    {a.resolved_at && (
                      <span className="flex items-center gap-1 text-[10px] text-success">
                        <CheckCircle2 className="size-3" />
                        Resolvida
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
