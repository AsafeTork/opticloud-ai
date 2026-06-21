"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  AlertTriangle,
  Lightbulb,
  Cloud,
  Settings,
  LogOut,
  Plus,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import type { DashboardSummary } from "@repo/types"

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badgeKey?: "anomalies"
}

const NAV: NavItem[] = [
  { label: "Visão Geral",      href: "/dashboard",                 icon: LayoutDashboard },
  { label: "Anomalias",        href: "/dashboard/anomalies",       icon: AlertTriangle, badgeKey: "anomalies" },
  { label: "Recomendações",    href: "/dashboard/recommendations", icon: Lightbulb      },
  { label: "Contas Cloud",     href: "/dashboard/accounts",        icon: Cloud          },
  { label: "Orçamentos",       href: "/dashboard/budgets",         icon: Wallet         },
]

const BOTTOM: NavItem[] = [
  { label: "Configurações", href: "/dashboard/settings", icon: Settings },
]

interface SidebarProps {
  onAddAccount: () => void
  isOpen?: boolean
  onClose?: () => void
  onCriticalAlerts?: (n: number) => void
}

export function Sidebar({ onAddAccount, isOpen = false, onClose, onCriticalAlerts }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, signOut } = useAuth()
  const [criticalAlerts, setCriticalAlerts] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    apiFetch<DashboardSummary>("/api/dashboard/summary").then((s) => {
      if (s) {
        setCriticalAlerts(s.critical_alerts)
        onCriticalAlerts?.(s.critical_alerts)
      }
    })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fecha o drawer ao navegar no mobile
  useEffect(() => {
    onClose?.()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await signOut()
    router.push("/")
  }

  const initials    = (user?.email ?? "??").slice(0, 2).toUpperCase()
  const displayEmail = user?.email ?? ""

  return (
    <>
      {/* Backdrop mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex flex-col w-64 shrink-0 h-[100dvh] bg-sidebar border-r border-sidebar-border fixed left-0 top-0 z-40",
          "transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center px-5 h-14 border-b border-sidebar-border shrink-0">
          <Logo iconSize={28} />
        </div>

        {/* Add account button */}
        <div className="px-3 py-3 border-b border-sidebar-border shrink-0">
          <button
            onClick={() => { onClose?.(); onAddAccount() }}
            className="w-full flex items-center gap-2 h-8 px-3 rounded-lg border border-dashed border-sidebar-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-all duration-150"
          >
            <Plus className="size-3.5" />
            Adicionar conta
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-0.5" aria-label="Navegação principal">
          {NAV.map((item) => {
            const active = pathname === item.href
            const badge  = item.badgeKey === "anomalies" && criticalAlerts != null && criticalAlerts > 0
              ? criticalAlerts
              : null

            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badge != null && (
                  <span className="px-1.5 py-0.5 rounded-md bg-danger/15 text-danger text-[10px] font-medium tabular-nums">
                    {badge}
                  </span>
                )}
              </a>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5 shrink-0">
          {BOTTOM.map((item) => {
            const active = pathname === item.href
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </a>
            )
          })}

          {/* User row */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors duration-150 cursor-pointer group">
            <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{displayEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sair"
              className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all duration-150 shrink-0"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
