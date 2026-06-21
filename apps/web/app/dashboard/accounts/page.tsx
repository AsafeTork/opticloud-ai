"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Cloud, CheckCircle2, XCircle, Clock, Trash2, RefreshCw, Plus, AlertCircle } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { AddAccountModal } from "@/components/dashboard/AddAccountModal"
import { Skeleton } from "@/components/ui/Skeleton"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import type { CloudAccount } from "@repo/types"

const STATUS_CFG = {
  active:   { icon: CheckCircle2, label: "Ativa",         cls: "text-success bg-success/10"  },
  syncing:  { icon: RefreshCw,    label: "Sincronizando", cls: "text-warning bg-warning/10"  },
  error:    { icon: XCircle,      label: "Erro",          cls: "text-danger  bg-danger/10"   },
  inactive: { icon: Clock,        label: "Inativa",       cls: "text-muted-foreground bg-muted/20" },
}

const PROVIDER_CFG = {
  aws:   { label: "AWS",   color: "text-chart-1" },
  gcp:   { label: "GCP",   color: "text-chart-2" },
  azure: { label: "Azure", color: "text-chart-3" },
}

function fmtUSD(n: number | null): string {
  if (!n) return "—"
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

interface Toast { id: number; text: string }

export default function AccountsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [accounts, setAccounts] = useState<CloudAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    if (!authLoading && !user) router.push("/")
  }, [authLoading, user, router])

  async function load() {
    setLoading(true)
    setLoadError(false)
    const data = await apiFetch<CloudAccount[]>("/api/accounts/")
    if (data === null) {
      setLoadError(true)
    } else {
      setAccounts(data)
    }
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function addToast(text: string) {
    const id = Date.now()
    setToasts((t) => [...t.slice(-3), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  async function handleDelete(id: string, name: string) {
    const ok = await apiFetch(`/api/accounts/${id}`, { method: "DELETE" })
    if (ok !== null) {
      setAccounts((a) => a.filter((x) => x.id !== id))
      addToast(`Conta "${name}" removida.`)
    } else {
      addToast("Erro ao remover conta.")
    }
  }

  if (authLoading) return null

  return (
    <DashboardShell title="Contas Cloud" breadcrumb="Dashboard / Contas Cloud" onToast={addToast}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando…" : `${accounts.length} conta${accounts.length !== 1 ? "s" : ""} conectada${accounts.length !== 1 ? "s" : ""}`}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-150"
          >
            <Plus className="size-3.5" />
            Adicionar conta
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-12 flex flex-col items-center gap-3 text-center">
            <div className="size-12 rounded-full bg-danger/10 flex items-center justify-center">
              <AlertCircle className="size-6 text-danger" />
            </div>
            <p className="text-sm font-medium text-foreground">Erro ao carregar contas</p>
            <p className="text-xs text-muted-foreground max-w-52">
              Verifique sua conexão e tente novamente.
            </p>
            <button
              onClick={load}
              className="mt-2 flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-all duration-150"
            >
              <RefreshCw className="size-3.5" />
              Tentar novamente
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center gap-3 text-center card-enter">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center">
              <Cloud className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma conta conectada</p>
            <p className="text-xs text-muted-foreground max-w-52">
              Adicione sua primeira conta cloud para começar a monitorar custos.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-2 flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all duration-150"
            >
              <Plus className="size-3.5" />
              Adicionar conta
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden card-enter">
            {accounts.map((acc) => {
              const status = STATUS_CFG[acc.status] ?? STATUS_CFG.inactive
              const provider = PROVIDER_CFG[acc.provider] ?? { label: acc.provider.toUpperCase(), color: "text-foreground" }
              const StatusIcon = status.icon
              return (
                <div key={acc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-accent/50 transition-colors duration-150">
                  <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Cloud className={`size-4 ${provider.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{acc.account_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{acc.account_id} · {provider.label}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${status.cls}`}>
                      <StatusIcon className="size-3" />
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground shrink-0 min-w-16 text-right">
                    {fmtUSD(acc.monthly_cost_usd)}
                  </p>
                  <button
                    onClick={() => handleDelete(acc.id, acc.account_name)}
                    aria-label={`Remover ${acc.account_name}`}
                    className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all duration-150 shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AddAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(_provider, name) => {
          setModalOpen(false)
          load()
          addToast(`Conta "${name}" conectada!`)
        }}
      />

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
