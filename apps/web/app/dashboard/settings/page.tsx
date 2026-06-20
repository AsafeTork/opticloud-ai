"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User, Building2, LogOut, Shield, Bell, Key } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import type { Profile, Organization } from "@repo/types"

type Tab = "profile" | "organization" | "notifications" | "security"

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Perfil",         icon: User      },
  { id: "organization",  label: "Organização",    icon: Building2 },
  { id: "notifications", label: "Notificações",   icon: Bell      },
  { id: "security",      label: "Segurança",      icon: Shield    },
]

interface Toast { id: number; text: string }

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()

  const [tab, setTab]         = useState<Tab>("profile")
  const [toasts, setToasts]   = useState<Toast[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [org, setOrg]         = useState<Organization | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push("/")
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    Promise.all([
      apiFetch<Profile>("/api/profile"),
      apiFetch<Organization>("/api/organization"),
    ]).then(([p, o]) => {
      if (p) setProfile(p)
      if (o) setOrg(o)
    })
  }, [user])

  function addToast(text: string) {
    const id = Date.now()
    setToasts((t) => [...t.slice(-3), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  async function handleLogout() {
    await signOut()
    router.push("/")
  }

  if (authLoading) return null

  const displayName  = profile?.full_name ?? user?.email ?? "Usuário"
  const displayEmail = user?.email ?? ""
  const initials     = displayName.slice(0, 2).toUpperCase()

  return (
    <DashboardShell title="Configurações" breadcrumb="Dashboard / Configurações" onToast={addToast}>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">

        {/* ── Mobile nav: select + botão Sair na mesma linha ── */}
        <div className="flex items-center gap-2 md:hidden">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as Tab)}
            className="flex-1 h-10 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TABS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <button
            onClick={handleLogout}
            className="h-10 px-3 rounded-lg flex items-center gap-2 text-sm text-danger border border-danger/30 hover:bg-danger/10 transition-all duration-150 shrink-0"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>

        {/* ── Desktop nav: lista vertical ── */}
        <nav className="hidden md:flex md:flex-col md:w-44 md:shrink-0 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                tab === id
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
          <div className="pt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-all duration-150"
            >
              <LogOut className="size-4 shrink-0" />
              Sair
            </button>
          </div>
        </nav>

        {/* ── Conteúdo ── */}
        <div className="flex-1 min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6 card-enter">
          {tab === "profile" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Perfil</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Suas informações pessoais.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-base font-semibold text-primary">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile?.role ?? "—"}</p>
                </div>
              </div>
              <div className="space-y-3 max-w-sm">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Nome completo</label>
                  <input
                    readOnly
                    value={profile?.full_name ?? ""}
                    placeholder="—"
                    className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">E-mail</label>
                  <input
                    readOnly
                    value={displayEmail}
                    className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "organization" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Organização</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Detalhes da sua organização.</p>
              </div>
              {org ? (
                <div className="space-y-3 max-w-sm">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Nome</label>
                    <input readOnly value={org.name} className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Slug</label>
                    <input readOnly value={org.slug} className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-muted-foreground font-mono focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Plano</label>
                    <input readOnly value={org.plan.charAt(0).toUpperCase() + org.plan.slice(1)} className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none" />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma organização associada à sua conta.</p>
              )}
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Notificações</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Em breve — alertas por e-mail e Slack.</p>
              </div>
              <div className="rounded-xl border border-border p-8 flex flex-col items-center gap-2 text-center">
                <Bell className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Configurações de notificações em breve.</p>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Segurança</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Credenciais e autenticação.</p>
              </div>
              <div className="space-y-3 max-w-sm">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Key className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">Alterar senha</span>
                  </div>
                  <button
                    onClick={() => addToast("Redefinição de senha enviada por e-mail.")}
                    className="text-xs text-primary hover:underline transition-all duration-150 shrink-0"
                  >
                    Enviar link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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
