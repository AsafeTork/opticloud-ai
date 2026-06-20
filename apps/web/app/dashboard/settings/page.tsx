"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User, Building2, LogOut, Save, Shield, Bell, Key, ChevronRight } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

type Tab = "profile" | "organization" | "notifications" | "security"

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Perfil",         icon: User      },
  { id: "organization",  label: "Organização",    icon: Building2 },
  { id: "notifications", label: "Notificações",   icon: Bell      },
  { id: "security",      label: "Segurança",      icon: Shield    },
]

interface ToastMsg { id: number; text: string }

export default function SettingsPage() {
  const router = useRouter()
  const [tab, setTab]     = useState<Tab>("profile")
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  // Profile form
  const [name, setName]   = useState("João Dinis")
  const [email, setEmail] = useState("joao@empresa.com")
  const [role, setRole]   = useState("Administrador")

  // Org form
  const [orgName, setOrgName]   = useState("Empresa S.A.")
  const [orgSlug, setOrgSlug]   = useState("empresa-sa")
  const [orgPlan, setOrgPlan]   = useState("Enterprise")

  // Notifications
  const [notifAnomalies,  setNotifAnomalies]  = useState(true)
  const [notifBudget,     setNotifBudget]     = useState(true)
  const [notifRecs,       setNotifRecs]       = useState(false)
  const [notifWeekly,     setNotifWeekly]     = useState(true)

  function addToast(text: string) {
    const id = Date.now()
    setToasts((t) => [...t.slice(-3), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  function save() {
    addToast("Configurações salvas com sucesso.")
  }

  function handleLogout() {
    router.push("/")
  }

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    )
  }

  return (
    <DashboardShell title="Configurações" breadcrumb="Dashboard / Configurações" onToast={addToast}>
      <div className="flex gap-6 items-start">

        {/* Tab sidebar */}
        <nav className="w-52 shrink-0 space-y-0.5" aria-label="Seções de configurações">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-all duration-150 ${
                tab === t.id
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <t.icon className="size-4 shrink-0" />
              {t.label}
            </button>
          ))}

          <div className="pt-3 mt-3 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 h-9 px-3 rounded-lg text-sm text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all duration-150"
            >
              <LogOut className="size-4 shrink-0" />
              Sair
            </button>
          </div>
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Profile */}
          {tab === "profile" && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Perfil</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Informações pessoais da sua conta.</p>
              </div>
              <div className="p-6 space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-lg font-semibold text-primary">JD</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">{email}</p>
                    <button className="mt-1 text-xs text-primary hover:underline transition-all duration-150">
                      Alterar foto
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Nome completo</label>
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">E-mail</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                      className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Cargo / Função</label>
                    <input value={role} onChange={(e) => setRole(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end">
                <button onClick={save} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-150">
                  <Save className="size-3.5" />
                  Salvar alterações
                </button>
              </div>
            </div>
          )}

          {/* Organization */}
          {tab === "organization" && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Organização</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Configurações do workspace compartilhado.</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Nome da Organização</label>
                    <input value={orgName} onChange={(e) => setOrgName(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Identificador (slug)</label>
                    <input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150" />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Plano Atual</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Seu workspace está no plano <span className="text-primary font-medium">{orgPlan}</span>.</p>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-primary hover:underline transition-all duration-150">
                    Gerenciar plano
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end">
                <button onClick={save} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-150">
                  <Save className="size-3.5" />
                  Salvar alterações
                </button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {tab === "notifications" && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Notificações</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Escolha quando e como receber alertas.</p>
              </div>
              <div className="divide-y divide-border">
                {[
                  { label: "Anomalias detectadas",          desc: "Receba um alerta imediato quando uma anomalia for detectada.",           value: notifAnomalies, onChange: setNotifAnomalies },
                  { label: "Orçamento próximo do limite",   desc: "Seja notificado quando um orçamento atingir 80% do limite.",             value: notifBudget,    onChange: setNotifBudget    },
                  { label: "Novas recomendações",           desc: "Receba um aviso quando novas oportunidades de economia forem geradas.",   value: notifRecs,      onChange: setNotifRecs      },
                  { label: "Relatório semanal",             desc: "Receba um resumo dos custos e economia identificada toda segunda-feira.", value: notifWeekly,    onChange: setNotifWeekly    },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-6 py-4 gap-4">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                    <Toggle value={item.value} onChange={item.onChange} />
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end">
                <button onClick={save} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-150">
                  <Save className="size-3.5" />
                  Salvar preferências
                </button>
              </div>
            </div>
          )}

          {/* Security */}
          {tab === "security" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">Alterar Senha</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Use uma senha forte com pelo menos 8 caracteres.</p>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { label: "Senha atual",      id: "cur-pw"  },
                    { label: "Nova senha",        id: "new-pw"  },
                    { label: "Confirmar senha",   id: "conf-pw" },
                  ].map((f) => (
                    <div key={f.id} className="space-y-1.5 max-w-sm">
                      <label htmlFor={f.id} className="text-xs font-medium text-foreground">{f.label}</label>
                      <input id={f.id} type="password" placeholder="••••••••"
                        className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150" />
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-border flex justify-end">
                  <button onClick={() => addToast("Senha alterada com sucesso.")}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-150">
                    <Key className="size-3.5" />
                    Alterar senha
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-danger/20 bg-danger/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-danger/10">
                  <h2 className="text-sm font-semibold text-danger">Zona de Perigo</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Ações irreversíveis — prossiga com cautela.</p>
                </div>
                <div className="p-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Encerrar sessão em todos os dispositivos</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Todos os tokens ativos serão invalidados imediatamente.</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="shrink-0 flex items-center gap-2 h-9 px-4 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-all duration-150"
                  >
                    <LogOut className="size-3.5" />
                    Sair de tudo
                  </button>
                </div>
              </div>
            </div>
          )}
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
