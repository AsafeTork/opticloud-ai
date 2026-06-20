"use client"

import { useState } from "react"
import { Cloud, CheckCircle2, XCircle, Clock, Trash2, RefreshCw, Plus } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

type Provider = "aws" | "gcp" | "azure"
type Status   = "active" | "error" | "syncing"

interface CloudAccount {
  id: string
  name: string
  provider: Provider
  accountId: string
  status: Status
  lastSync: string
  monthlyCost: string
}

const MOCK_ACCOUNTS: CloudAccount[] = [
  { id: "1", name: "Produção Principal",    provider: "aws",   accountId: "123456789012", status: "active",  lastSync: "há 4 min",  monthlyCost: "R$ 2.340.000" },
  { id: "2", name: "Homologação",           provider: "aws",   accountId: "234567890123", status: "active",  lastSync: "há 4 min",  monthlyCost: "R$ 120.000"   },
  { id: "3", name: "Data Analytics",        provider: "gcp",   accountId: "proj-data-001", status: "active",  lastSync: "há 7 min",  monthlyCost: "R$ 780.000"   },
  { id: "4", name: "ML Pipeline",           provider: "gcp",   accountId: "proj-ml-007",   status: "syncing", lastSync: "sincronizando…", monthlyCost: "R$ 320.000" },
  { id: "5", name: "Azure Enterprise",      provider: "azure", accountId: "sub-e8f3d2a1",  status: "error",   lastSync: "falha",     monthlyCost: "—"            },
  { id: "6", name: "Azure Dev/Test",        provider: "azure", accountId: "sub-c4b1f0d9",  status: "active",  lastSync: "há 12 min", monthlyCost: "R$ 58.000"    },
]

const PROVIDER_META: Record<Provider, { label: string; color: string; dot: string }> = {
  aws:   { label: "Amazon Web Services",   color: "text-chart-1", dot: "bg-chart-1" },
  gcp:   { label: "Google Cloud Platform", color: "text-chart-2", dot: "bg-chart-2" },
  azure: { label: "Microsoft Azure",       color: "text-chart-3", dot: "bg-chart-3" },
}

const STATUS_META: Record<Status, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  active:  { label: "Ativo",          icon: <CheckCircle2 className="size-3.5" />, color: "text-success", bg: "bg-success/10" },
  error:   { label: "Erro",           icon: <XCircle      className="size-3.5" />, color: "text-danger",  bg: "bg-danger/10"  },
  syncing: { label: "Sincronizando",  icon: <RefreshCw    className="size-3.5 animate-spin" />, color: "text-warning", bg: "bg-warning/10" },
}

interface ToastMsg { id: number; text: string }

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<CloudAccount[]>(MOCK_ACCOUNTS)
  const [toasts, setToasts]     = useState<ToastMsg[]>([])
  const [filter, setFilter]     = useState<Provider | "all">("all")

  function addToast(text: string) {
    const id = Date.now()
    setToasts((t) => [...t.slice(-3), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  function removeAccount(id: string) {
    setAccounts((a) => a.filter((x) => x.id !== id))
    addToast("Conta removida com sucesso.")
  }

  const filtered = filter === "all" ? accounts : accounts.filter((a) => a.provider === filter)

  const stats = {
    total:   accounts.length,
    active:  accounts.filter((a) => a.status === "active").length,
    error:   accounts.filter((a) => a.status === "error").length,
    syncing: accounts.filter((a) => a.status === "syncing").length,
  }

  return (
    <DashboardShell title="Contas Cloud" breadcrumb="Dashboard / Contas Cloud" onToast={addToast}>
      <div className="space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total de Contas", value: stats.total,   color: "text-foreground"  },
            { label: "Ativas",          value: stats.active,  color: "text-success"     },
            { label: "Com Erro",        value: stats.error,   color: "text-danger"      },
            { label: "Sincronizando",   value: stats.syncing, color: "text-warning"     },
          ].map((s) => (
            <div key={s.label} className="card-enter rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(["all", "aws", "gcp", "azure"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  filter === p
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "all" ? "Todas" : p.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => addToast("Abrir modal para adicionar conta...")}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-150"
          >
            <Plus className="size-4" />
            Adicionar Conta
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Conta</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Provedor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">ID / Projeto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Última Sync</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Custo Mensal</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((account, i) => {
                  const p = PROVIDER_META[account.provider]
                  const s = STATUS_META[account.status]
                  return (
                    <tr
                      key={account.id}
                      className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors duration-100"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Cloud className="size-3.5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground text-sm">{account.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`size-2 rounded-full shrink-0 ${p.dot}`} />
                          <span className={`text-xs font-medium ${p.color}`}>{account.provider.toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{account.accountId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${s.bg} ${s.color}`}>
                          {s.icon}
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{account.lastSync}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-foreground">{account.monthlyCost}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeAccount(account.id)}
                          aria-label={`Remover conta ${account.name}`}
                          className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all duration-150 ml-auto"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Cloud className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma conta encontrada</p>
              <p className="text-xs text-muted-foreground/60">Tente outro filtro ou adicione uma nova conta.</p>
            </div>
          )}
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
