"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Wallet, Plus, X, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import type { Budget as ApiBudget } from "@repo/types"

type BudgetStatus = "ok" | "warning" | "exceeded"
type BudgetPeriod = "monthly" | "quarterly" | "annual"

interface Budget {
  id: string
  name: string
  provider: "aws" | "gcp" | "azure" | "all"
  limit: number
  spent: number
  period: BudgetPeriod
  status: BudgetStatus
}

const STATUS_META: Record<BudgetStatus, { label: string; color: string; bg: string; barColor: string; icon: React.ReactNode }> = {
  ok:       { label: "Dentro do limite", color: "text-success", bg: "bg-success/10", barColor: "bg-success", icon: <CheckCircle2 className="size-3.5" /> },
  warning:  { label: "Atenção",          color: "text-warning", bg: "bg-warning/10", barColor: "bg-warning", icon: <AlertTriangle className="size-3.5" /> },
  exceeded: { label: "Excedido",         color: "text-danger",  bg: "bg-danger/10",  barColor: "bg-danger",  icon: <TrendingUp    className="size-3.5" /> },
}

const PERIOD_LABEL: Record<BudgetPeriod, string> = {
  monthly:   "Mensal",
  quarterly: "Trimestral",
  annual:    "Anual",
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function computeStatus(spent: number, limit: number, threshold: number): BudgetStatus {
  const pct = limit > 0 ? (spent / limit) * 100 : 0
  if (pct >= 100) return "exceeded"
  if (pct >= threshold) return "warning"
  return "ok"
}

function mapApiBudget(b: ApiBudget): Budget {
  return {
    id: b.id,
    name: b.name,
    provider: b.provider as Budget["provider"],
    limit: b.amount_usd,
    spent: b.current_spend_usd,
    period: b.period as BudgetPeriod,
    status: computeStatus(b.current_spend_usd, b.amount_usd, b.alert_threshold_pct),
  }
}

interface ToastMsg { id: number; text: string }

export default function BudgetsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  const [formName, setFormName] = useState("")
  const [formProvider, setFormProvider] = useState<Budget["provider"]>("aws")
  const [formLimit, setFormLimit] = useState("")
  const [formPeriod, setFormPeriod] = useState<BudgetPeriod>("monthly")

  useEffect(() => {
    if (!authLoading && !user) router.push("/")
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiFetch<ApiBudget[]>("/api/budgets/").then((data) => {
      setBudgets((data ?? []).map(mapApiBudget))
      setLoading(false)
    })
  }, [user])

  function addToast(text: string) {
    const id = Date.now()
    setToasts((t) => [...t.slice(-3), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  function removeBudget(id: string) {
    setBudgets((b) => b.filter((x) => x.id !== id))
    addToast("Orçamento removido.")
  }

  function createBudget() {
    if (!formName || !formLimit) return
    const limit = parseFloat(formLimit)
    if (isNaN(limit) || limit <= 0) return
    const newBudget: Budget = {
      id: `local-${Date.now()}`,
      name: formName,
      provider: formProvider,
      limit,
      spent: 0,
      period: formPeriod,
      status: "ok",
    }
    setBudgets((b) => [newBudget, ...b])
    setFormName("")
    setFormLimit("")
    setShowForm(false)
    addToast(`Orçamento "${formName}" criado.`)
  }

  const exceededCount = budgets.filter((b) => b.status === "exceeded").length
  const warningCount  = budgets.filter((b) => b.status === "warning").length

  if (authLoading) return null

  return (
    <DashboardShell title="Orçamentos" breadcrumb="Dashboard / Orçamentos">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total de Orçamentos", value: budgets.length,                                      color: "text-foreground" },
            { label: "Dentro do Limite",    value: budgets.filter((b) => b.status === "ok").length,      color: "text-success"   },
            { label: "Em Atenção",          value: warningCount,                                         color: "text-warning"   },
            { label: "Excedidos",           value: exceededCount,                                        color: "text-danger"    },
          ].map((s) => (
            <div key={s.label} className="card-enter rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Alert banner */}
        {exceededCount > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3">
            <AlertTriangle className="size-4 text-danger mt-0.5 shrink-0" />
            <p className="text-sm text-danger">
              <span className="font-semibold">{exceededCount} orçamento{exceededCount > 1 ? "s" : ""} excedido{exceededCount > 1 ? "s" : ""}.</span>
              {" "}Verifique os detalhes abaixo e tome as medidas necessárias.
            </p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Todos os Orçamentos</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-150"
          >
            <Plus className="size-4" />
            Novo Orçamento
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card-enter rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Criar Orçamento</h3>
              <button onClick={() => setShowForm(false)} className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150">
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nome do Orçamento</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: AWS Produção Q3"
                  className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Provedor</label>
                <select
                  value={formProvider}
                  onChange={(e) => setFormProvider(e.target.value as Budget["provider"])}
                  className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150 cursor-pointer"
                >
                  <option value="all">Todos os Provedores</option>
                  <option value="aws">Amazon Web Services</option>
                  <option value="gcp">Google Cloud Platform</option>
                  <option value="azure">Microsoft Azure</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Limite ($)</label>
                <input
                  value={formLimit}
                  onChange={(e) => setFormLimit(e.target.value)}
                  placeholder="Ex: 5000"
                  type="number"
                  min="1"
                  className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Período</label>
                <select
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value as BudgetPeriod)}
                  className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150 cursor-pointer"
                >
                  <option value="monthly">Mensal</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150">
                Cancelar
              </button>
              <button
                onClick={createBudget}
                disabled={!formName || !formLimit}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              >
                Criar Orçamento
              </button>
            </div>
          </div>
        )}

        {/* Budget list */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[160px] rounded-xl" />)}
          </div>
        ) : budgets.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center gap-3 text-center card-enter">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center">
              <Wallet className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhum orçamento definido</p>
            <p className="text-xs text-muted-foreground max-w-56">
              Crie orçamentos para monitorar gastos por provedor ou projeto.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all duration-150"
            >
              <Plus className="size-3.5" />
              Criar primeiro orçamento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {budgets.map((budget, i) => {
              const pct    = Math.min((budget.spent / budget.limit) * 100, 100)
              const s      = STATUS_META[budget.status]
              const isOver = budget.status === "exceeded"
              const overPct = isOver ? (((budget.spent - budget.limit) / budget.limit) * 100).toFixed(0) : null
              return (
                <div
                  key={budget.id}
                  className={`card-enter rounded-xl border bg-card p-5 space-y-4 transition-all duration-150 ${budget.status === "exceeded" ? "border-danger/30" : budget.status === "warning" ? "border-warning/20" : "border-border"}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{budget.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.bg} ${s.color}`}>
                          {s.icon}{s.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {budget.provider === "all" ? "Todos os provedores" : budget.provider.toUpperCase()} · {PERIOD_LABEL[budget.period]}
                      </p>
                    </div>
                    <button
                      onClick={() => removeBudget(budget.id)}
                      aria-label={`Remover orçamento ${budget.name}`}
                      className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all duration-150 shrink-0"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Gasto: <span className={`font-semibold ${isOver ? "text-danger" : "text-foreground"}`}>{fmt(budget.spent)}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Limite: <span className="font-semibold text-foreground">{fmt(budget.limit)}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${s.barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${s.color}`}>{pct.toFixed(0)}% utilizado</span>
                      {isOver ? (
                        <span className="text-xs font-semibold text-danger">+{overPct}% acima do limite</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{fmt(budget.limit - budget.spent)} restante</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
