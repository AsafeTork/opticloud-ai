"use client"

import { useState } from "react"
import { DollarSign, Zap, Cloud, TrendingDown, Bell, RefreshCw } from "lucide-react"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { KpiCard } from "@/components/dashboard/KpiCard"
import { CostTrendChart } from "@/components/dashboard/CostTrendChart"
import { ProviderBreakdown } from "@/components/dashboard/ProviderBreakdown"
import { AnomalyList } from "@/components/dashboard/AnomalyList"
import { RecommendationsCritical } from "@/components/dashboard/RecommendationsCritical"
import { AddAccountModal } from "@/components/dashboard/AddAccountModal"

/* ─── Mock data ─────────────────────────────────────── */
const spark = (seed: number[]) => seed.map((v) => ({ v }))

const KPI_DATA = [
  {
    label: "Custo Total do Mês",
    value: "R$ 4.218.340",
    delta: 12,
    icon: DollarSign,
    colorClass: "text-chart-1",
    sparkline: spark([320, 380, 350, 410, 390, 430, 470, 490, 510, 480]),
  },
  {
    label: "Anomalias Ativas",
    value: "23",
    delta: 8,
    icon: Zap,
    colorClass: "text-warning",
    sparkline: spark([5, 8, 6, 12, 9, 15, 18, 21, 20, 23]),
  },
  {
    label: "Contas Conectadas",
    value: "12",
    delta: 0,
    icon: Cloud,
    colorClass: "text-chart-2",
    sparkline: spark([10, 10, 10, 10, 11, 11, 12, 12, 12, 12]),
  },
  {
    label: "Economia Identificada",
    value: "R$ 381.200",
    delta: -5,
    icon: TrendingDown,
    colorClass: "text-success",
    sparkline: spark([400, 420, 410, 390, 405, 395, 380, 390, 385, 381]),
  },
]

const TREND_DATA = [
  { month: "Jan", aws: 120000, gcp: 45000, azure: 30000 },
  { month: "Fev", aws: 138000, gcp: 48000, azure: 35000 },
  { month: "Mar", aws: 125000, gcp: 52000, azure: 28000 },
  { month: "Abr", aws: 160000, gcp: 55000, azure: 42000 },
  { month: "Mai", aws: 175000, gcp: 60000, azure: 48000 },
  { month: "Jun", aws: 190000, gcp: 65000, azure: 52000 },
]

const PROVIDERS = [
  { name: "Amazon Web Services",   amount: 2_340_000, pct: 55, color: "text-chart-1", bar: "bg-chart-1" },
  { name: "Google Cloud Platform", amount: 1_100_000, pct: 26, color: "text-chart-2", bar: "bg-chart-2" },
  { name: "Microsoft Azure",       amount:   778_340, pct: 19, color: "text-chart-3", bar: "bg-chart-3" },
]

const ANOMALIES = [
  { id: "a1", title: "Pico de egress na região us-east-1", provider: "AWS",   service: "EC2",         delta: 340, severity: "critical" as const, time: "há 12 min"  },
  { id: "a2", title: "BigQuery jobs acima do budget",      provider: "GCP",   service: "BigQuery",    delta: 87,  severity: "high"     as const, time: "há 1 h"     },
  { id: "a3", title: "Azure Functions com CPU elevada",    provider: "Azure", service: "Functions",   delta: 52,  severity: "medium"   as const, time: "há 3 h"     },
  { id: "a4", title: "S3 requests inesperados",            provider: "AWS",   service: "S3",          delta: 210, severity: "high"     as const, time: "há 4 h"     },
]

const RECOMMENDATIONS = [
  {
    id: "r1",
    title: "Migrar instâncias para Graviton3",
    description: "56 instâncias EC2 x86 elegíveis para migração para ARM. Redução de custo de até 30% com performance superior.",
    saving: "R$ 85.000/mês",
    provider: "AWS",
    priority: "critical" as const,
  },
  {
    id: "r2",
    title: "Redimensionar VMs subutilizadas",
    description: "12 VMs no Azure com uso médio de CPU < 5%. Downgrade de SKU pode ser feito sem impacto em produção.",
    saving: "R$ 22.400/mês",
    provider: "Azure",
    priority: "high" as const,
  },
  {
    id: "r3",
    title: "Reservar capacidade GKE",
    description: "Cluster GKE com carga previsível nos últimos 90 dias. Comprometimento de 1 ano pode gerar economia significativa.",
    saving: "R$ 41.600/mês",
    provider: "GCP",
    priority: "high" as const,
  },
]

/* ─── Toast ─────────────────────────────────────────── */
interface ToastMsg { id: number; text: string }

/* ─── Page ───────────────────────────────────────────── */
export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const [refreshing, setRefreshing] = useState(false)

  function addToast(text: string) {
    const id = Date.now()
    setToasts((t) => [...t.slice(-3), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 1000))
    setRefreshing(false)
    addToast("Dados atualizados com sucesso.")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onAddAccount={() => setModalOpen(true)} />

      {/* Main content */}
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-6 bg-background/80 backdrop-blur-md border-b border-border shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Visão Geral</h1>
            <p className="text-[11px] text-muted-foreground">
              Dashboard / Visão Geral
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              aria-label="Atualizar dados"
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
            >
              <RefreshCw
                className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
            <button
              aria-label="Notificações"
              className="relative size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
            >
              <Bell className="size-4" />
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger"
              />
            </button>
            <div className="h-5 w-px bg-border mx-1" />
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-accent transition-colors duration-150 cursor-pointer">
              <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-primary">JD</span>
              </div>
              <span className="text-xs font-medium text-foreground">João Dinis</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {KPI_DATA.map((kpi, i) => (
              <KpiCard key={kpi.label} {...kpi} index={i} />
            ))}
          </div>

          {/* Trend + Provider */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <CostTrendChart data={TREND_DATA} />
            </div>
            <ProviderBreakdown items={PROVIDERS} total="R$ 4,21 M" />
          </div>

          {/* Anomalies + Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnomalyList
              anomalies={ANOMALIES}
              onViewAll={() => addToast("Navegando para Anomalias...")}
            />
            <RecommendationsCritical
              recommendations={RECOMMENDATIONS}
              onViewAll={() => addToast("Navegando para Recomendações...")}
            />
          </div>
        </main>
      </div>

      {/* Modal */}
      <AddAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(provider, name) =>
          addToast(`Conta "${name}" (${provider.toUpperCase()}) conectada!`)
        }
      />

      {/* Toasts */}
      <div
        aria-live="polite"
        aria-label="Notificações"
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
