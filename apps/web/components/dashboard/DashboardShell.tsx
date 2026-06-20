"use client"

import { useState } from "react"
import { Bell, RefreshCw } from "lucide-react"
import { Sidebar } from "./Sidebar"
import { AddAccountModal } from "./AddAccountModal"

interface DashboardShellProps {
  title: string
  breadcrumb: string
  children: React.ReactNode
  onToast?: (msg: string) => void
}

export function DashboardShell({ title, breadcrumb, children, onToast }: DashboardShellProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 900))
    setRefreshing(false)
    onToast?.("Dados atualizados com sucesso.")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onAddAccount={() => setModalOpen(true)} />

      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-6 bg-background/80 backdrop-blur-md border-b border-border shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-foreground">{title}</h1>
            <p className="text-[11px] text-muted-foreground">{breadcrumb}</p>
          </div>
          <div className="flex items-center gap-2">
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
              <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger" />
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

        <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto">
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
