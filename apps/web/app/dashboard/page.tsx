"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DollarSign, Zap, Cloud, TrendingDown, Bell, RefreshCw, Menu } from "lucide-react"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { KpiCard } from "@/components/dashboard/KpiCard"
import { CostTrendChart } from "@/components/dashboard/CostTrendChart"
import { ProviderBreakdown } from "@/components/dashboard/ProviderBreakdown"
import { AnomalyList } from "@/components/dashboard/AnomalyList"
import { RecommendationsCritical } from "@/components/dashboard/RecommendationsCritical"
import { AddAccountModal } from "@/components/dashboard/AddAccountModal"
import { Skeleton } from "@/components/ui/Skeleton"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import type { DashboardSummary, CostTrendPoint, Anomaly as ApiAnomaly, Recommendation } from "@repo/types"
import type { Anomaly as UIAnomaly } from "@/components/dashboard/AnomalyList"

/* ─── Helpers ─────────────────────────────────────── */
function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "agora mesmo"
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  return `há ${Math.floor(diff / 86400)} d`
}

function mapAnomaly(a: ApiAnomaly): UIAnomaly {
  const severityMap: Record<string, UIAnomaly["severity"]> = {
    critical: "critical",
    warning: "high",
    info: "medium",
  }
  return {
    id: a.id,
    title: a.title,
    provider: a.provider.toUpperCase(),
    service: a.resource_type,
    delta: Math.round(a.deviation_pct),
    severity: severityMap[a.severity] ?? "medium",
    time: relativeTime(a.detected_at),
  }
}

function mapRecommendation(r: Recommendation) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    saving: r.estimated_savings_usd ? `${fmtUSD(r.estimated_savings_usd)}/mês` : "—",
    provider: (r.metadata?.provider as string | undefined) ?? r.category,
    priority: r.priority as "critical" | "high",
  }
}

interface ToastMsg { id: number; text: string }

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [trends, setTrends] = useState<CostTrendPoint[]>([])
  const [anomalies, setAnomalies] = useState<UIAnomaly[]>([])
  const [recommendations, setRecommendations] = useState<ReturnType<typeof mapRecommendation>[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const [modalOpen, setModalOpen]     = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toasts, setToasts]           = useState<ToastMsg[]>([])
  const [refreshing, setRefreshing]   = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push("/")
  }, [authLoading, user, router])

  const loadData = useCallback(async () => {
    setDataLoading(true)
    const [sum, trd, ano, recs] = await Promise.all([
      apiFetch<DashboardSummary>("/api/dashboard/summary"),
      apiFetch<CostTrendPoint[]>("/api/dashboard/cost-trends"),
      apiFetch<ApiAnomaly[]>("/api/dashboard/anomalies"),
      apiFetch<Recommendation[]>("/api/recommendations/"),
    ])
    setSummary(sum)
    setTrends(trd ?? [])
    setAnomalies((ano ?? []).slice(0, 4).map(mapAnomaly))
    setRecommendations(
      (recs ?? [])
        .filter((r) => r.priority === "critical" || r.priority === "high")
        .slice(0, 3)
        .map(mapRecommendation)
    )
    setDataLoading(false)
  }, [])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  function addToast(text: string) {
    const id = Date.now()
    setToasts((t) => [...t.slice(-3), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    addToast("Dados atualizados com sucesso.")
  }

  const providerItems = summary ? (() => {
    const { aws = 0, gcp = 0, azure = 0 } = summary.cost_by_provider
    const total = aws + gcp + azure || 1
    return [
      { name: "Amazon Web Services",   amount: aws,   pct: Math.round(aws / total * 100),   color: "text-chart-1", bar: "bg-chart-1" },
      { name: "Google Cloud Platform", amount: gcp,   pct: Math.round(gcp / total * 100),   color: "text-chart-2", bar: "bg-chart-2" },
      { name: "Microsoft Azure",       amount: azure, pct: Math.round(azure / total * 100), color: "text-chart-3", bar: "bg-chart-3" },
    ].filter((p) => p.amount > 0)
  })() : []

  const kpis = summary ? [
    {
      label: "Custo Total do Mês",
      value: fmtUSD(summary.total_monthly_cost_usd),
      delta: 0,
      icon: DollarSign,
      colorClass: "text-chart-1",
      sparkline: trends.slice(-10).map((t) => ({ v: t.total })),
    },
    {
      label: "Alertas Críticos",
      value: String(summary.critical_alerts),
      delta: 0,
      icon: Zap,
      colorClass: "text-warning",
      sparkline: [] as { v: number }[],
    },
    {
      label: "Contas Conectadas",
      value: String(summary.total_accounts),
      delta: 0,
      icon: Cloud,
      colorClass: "text-chart-2",
      sparkline: [] as { v: number }[],
    },
    {
      label: "Economia Identificada",
      value: fmtUSD(summary.potential_savings_usd),
      delta: 0,
      icon: TrendingDown,
      colorClass: "text-success",
      sparkline: [] as { v: number }[],
    },
  ] : []

  if (authLoading) return null

  return (
    <div className="flex min-h-[100dvh] bg-background overflow-x-hidden">
      <Sidebar
        onAddAccount={() => setModalOpen(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 sm:px-6 bg-background/80 backdrop-blur-md border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
              className="lg:hidden size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Visão Geral</h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Dashboard / Visão Geral</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleRefresh}
              aria-label="Atualizar dados"
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              aria-label="Notificações"
              className="relative size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
            >
              <Bell className="size-4" />
              {anomalies.length > 0 && (
                <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger" />
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-accent transition-colors duration-150 cursor-pointer">
              <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-primary">
                  {user?.email?.slice(0, 2).toUpperCase() ?? "??"}
                </span>
              </div>
              <span className="text-xs font-medium text-foreground truncate max-w-28">{user?.email ?? ""}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 max-w-[1280px] w-full mx-auto space-y-6">
          {dataLoading ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[108px] rounded-xl" />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Skeleton className="h-[260px] lg:col-span-2 rounded-xl" />
                <Skeleton className="h-[260px] rounded-xl" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton className="h-[300px] rounded-xl" />
                <Skeleton className="h-[300px] rounded-xl" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => <KpiCard key={kpi.label} {...kpi} index={i} />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <CostTrendChart data={trends} />
                </div>
                <ProviderBreakdown
                  items={providerItems}
                  total={fmtUSD(summary?.total_monthly_cost_usd ?? 0)}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AnomalyList
                  anomalies={anomalies}
                  onViewAll={() => router.push("/dashboard/anomalies")}
                />
                <RecommendationsCritical
                  recommendations={recommendations}
                  onViewAll={() => router.push("/dashboard/recommendations")}
                />
              </div>
            </>
          )}
        </main>
      </div>

      <AddAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(_provider, name) => addToast(`Conta "${name}" conectada!`)}
      />

      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="card-enter pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg text-sm text-foreground min-w-64"
          >
            <span className="size-2 rounded-full bg-success shrink-0" aria-hidden="true" />
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
