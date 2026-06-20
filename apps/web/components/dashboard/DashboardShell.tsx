"use client"

import { useEffect, useState } from "react"
import { Bell, RefreshCw, Menu } from "lucide-react"
import { Sidebar } from "./Sidebar"
import { AddAccountModal } from "./AddAccountModal"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import type { DashboardSummary } from "@repo/types"

interface DashboardShellProps {
  title: string
  breadcrumb: string
  children: React.ReactNode
  onToast?: (msg: string) => void
}

export function DashboardShell({ title, breadcrumb, children, onToast }: DashboardShellProps) {
  const [modalOpen, setModalOpen]     = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [criticalAlerts, setCriticalAlerts] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    apiFetch<DashboardSummary>("/api/dashboard/summary").then((s) => {
      if (s) setCriticalAlerts(s.critical_alerts)
    })
  }, [user])

  async function handleRefresh() {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 900))
    setRefreshing(false)
    onToast?.("Dados atualizados com sucesso.")
  }

  const initials     = (user?.email ?? "??").slice(0, 2).toUpperCase()
  const displayEmail = user?.email ?? ""

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
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
              <h1 className="text-sm font-semibold text-foreground">{title}</h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">{breadcrumb}</p>
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
              {criticalAlerts > 0 && (
                <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger" />
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-accent transition-colors duration-150 cursor-pointer">
              <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-primary">{initials}</span>
              </div>
              <span className="text-xs font-medium text-foreground truncate max-w-28">{displayEmail}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>

      <AddAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(provider, name) => onToast?.(`Conta "${name}" (${provider.toUpperCase()}) conectada!`)}
      />
    </div>
  )
}
