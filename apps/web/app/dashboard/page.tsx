"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/hooks/useAuth";
import { createClient } from "../../src/lib/supabase";
import type {
  DashboardSummary,
  CloudAccount,
  Recommendation,
  CostTrendPoint,
  Anomaly,
} from "@repo/types";
import { KpiCard } from "../../src/components/dashboard/KpiCard";
import { CostTrendChart } from "../../src/components/dashboard/CostTrendChart";
import { ProviderBreakdown } from "../../src/components/dashboard/ProviderBreakdown";
import { AnomalyList } from "../../src/components/dashboard/AnomalyList";
import { RecommendationsCritical } from "../../src/components/dashboard/RecommendationsCritical";
import { AddAccountModal } from "../../src/components/dashboard/AddAccountModal";
import {
  SkeletonKpiGrid,
  SkeletonChart,
  SkeletonList,
} from "../../src/components/ui/Skeleton";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
const TIMEOUT_MS = 15_000;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  const sb = createClient();
  const { data: { session } } = await sb.auth.getSession();
  const token = session?.access_token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    const json = await res.json() as { data: T | null; error: { message: string } | null };
    if (json.error || !res.ok) return null;
    return json.data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Nav items (role-aware) ───────────────────────────────────────────────────

type Tab = "overview" | "accounts" | "recs";

const NAV_ITEMS: { id: Tab; label: string; roles?: string[] }[] = [
  { id: "overview",  label: "Visão Geral" },
  { id: "accounts",  label: "Contas" },
  { id: "recs",      label: "Recomendações" },
];

// ─── Skeleton Dashboard ───────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando dashboard">
      <SkeletonKpiGrid />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><SkeletonChart /></div>
        <SkeletonChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonList rows={3} />
        <SkeletonList rows={5} />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  return (
    <div className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27]/80 p-16 text-center">
      <p className="text-5xl mb-4">☁️</p>
      <h2 className="text-lg font-semibold text-[#E5E7EB] mb-2">Conecte sua primeira conta cloud</h2>
      <p className="text-sm text-[#9CA3AF] max-w-xs mx-auto mb-6">
        Adicione uma conta AWS, GCP ou Azure para começar a monitorar e otimizar seus custos com IA.
      </p>
      <button
        onClick={() => onNavigate("accounts")}
        className="px-6 py-3 rounded-xl bg-[#0066FF] text-white font-medium text-sm
                   hover:bg-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2
                   focus-visible:ring-offset-[#0F1117] transition-colors min-h-[48px]"
      >
        Adicionar Conta
      </button>
    </div>
  );
}

// ─── Accounts Tab ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active:   "bg-[#00D4AA]/15 text-[#00D4AA]",
  syncing:  "bg-[#0066FF]/15 text-[#0066FF]",
  error:    "bg-[#FF4757]/15 text-[#FF4757]",
  inactive: "bg-[#6B7280]/15 text-[#6B7280]",
};

const PROVIDER_LABEL: Record<string, string> = { aws: "AWS", gcp: "GCP", azure: "Azure" };

function AccountsTab({
  accounts,
  onRefresh,
  apiFetch,
}: {
  accounts: CloudAccount[];
  onRefresh: () => void;
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T | null>;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <AddAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={onRefresh}
        apiFetch={apiFetch}
      />

      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#9CA3AF]">
            {accounts.length === 0 ? "Nenhuma conta conectada" : `${accounts.length} conta${accounts.length !== 1 ? "s" : ""} conectada${accounts.length !== 1 ? "s" : ""}`}
          </p>
          <div className="flex gap-2">
            {accounts.length > 0 && (
              <button
                onClick={onRefresh}
                className="text-xs px-3 py-2 rounded-lg bg-[#1A1D27] border border-[#2A2D3E]
                           text-[#9CA3AF] hover:text-[#E5E7EB] focus-visible:ring-2 focus-visible:ring-[#0066FF]
                           transition-colors min-h-[44px]"
              >
                Atualizar
              </button>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="text-sm px-4 py-2 rounded-xl bg-[#0066FF] text-white font-medium
                         hover:bg-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0066FF]
                         focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]
                         transition-colors min-h-[44px]"
            >
              + Adicionar conta
            </button>
          </div>
        </div>

        {/* Empty state */}
        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2A2D3E] bg-[#1A1D27]/50 p-16 text-center">
            <p className="text-4xl mb-4">🔌</p>
            <p className="text-sm font-medium text-[#E5E7EB] mb-1">Nenhuma conta cloud conectada</p>
            <p className="text-xs text-[#6B7280] mb-6">Conecte AWS, GCP ou Azure para começar a monitorar custos</p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-[#0066FF] text-white font-medium text-sm
                         hover:bg-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0066FF]
                         focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]
                         transition-colors min-h-[48px]"
            >
              Conectar primeira conta
            </button>
          </div>
        ) : (
          /* Account list */
          <div className="space-y-3">
            {accounts.map((a) => (
              <div key={a.id} className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27]/80 p-4 hover:bg-[#222535] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#E5E7EB]">{a.account_name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{PROVIDER_LABEL[a.provider]} · {a.account_id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.monthly_cost_usd != null && (
                      <span className="text-sm font-bold text-[#E5E7EB]">
                        ${a.monthly_cost_usd.toFixed(0)}/mês
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[a.status] ?? ""}`}>
                      {a.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const [summary, setSummary]   = useState<DashboardSummary | null>(null);
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [recs, setRecs]         = useState<Recommendation[]>([]);
  const [trends, setTrends]     = useState<CostTrendPoint[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<Tab>("overview");

  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    setFetchError(null);
    const [s, a, r, t, an] = await Promise.all([
      apiFetch<DashboardSummary>("/api/dashboard/summary"),
      apiFetch<CloudAccount[]>("/api/accounts"),
      apiFetch<Recommendation[]>("/api/recommendations"),
      apiFetch<CostTrendPoint[]>("/api/dashboard/cost-trends"),
      apiFetch<Anomaly[]>("/api/dashboard/anomalies"),
    ]);
    if (s) setSummary(s);
    if (a) setAccounts(a);
    if (r) setRecs(r);
    if (t) setTrends(t);
    if (an) setAnomalies(an);
    if (!s && !a && !r) setFetchError("Serviço indisponível. A API pode estar iniciando (aguarde 30s).");
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/"); return; }
    if (user) void fetchAll();
  }, [user, authLoading, router, fetchAll]);

  const updatingRef = useRef(new Set<string>());

  async function updateRecStatus(id: string, status: Recommendation["status"]) {
    if (updatingRef.current.has(id)) return;
    updatingRef.current.add(id);
    try {
      const updated = await apiFetch<Recommendation>(`/api/recommendations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (updated) {
        setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      }
    } finally {
      updatingRef.current.delete(id);
    }
  }

  async function generateRecs() {
    await apiFetch("/api/recommendations/generate", { method: "POST" });
    void fetchAll();
  }

  // TODO: pull from profile — cast prevents TS from narrowing to literal
  const userRole = ("owner" as string) as "owner" | "admin" | "member";

  const hasAccounts = accounts.length > 0;

  return (
    <div className="min-h-screen text-[#E5E7EB]" style={{ backgroundColor: "#0F1117" }}>
      {/* ── Header ── */}
      <header
        className="border-b border-[#2A2D3E] sticky top-0 z-20"
        style={{ backgroundColor: "rgba(15,17,23,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #0066FF, #0052CC)" }}
            >
              O
            </div>
            <span className="text-base font-semibold tracking-tight">OptiCloud AI</span>
            {userRole !== "member" && (
              <span className="hidden sm:block text-[10px] px-1.5 py-0.5 rounded-full bg-[#0066FF]/15 text-[#0066FF] font-medium">
                {userRole}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6B7280] hidden sm:block">{user?.email}</span>
            <button
              onClick={() => { void signOut().then(() => router.push("/")); }}
              className="text-sm text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors
                         px-3 py-2 min-h-[44px] rounded-lg focus-visible:ring-2 focus-visible:ring-[#0066FF]"
            >
              Sair
            </button>
          </div>
        </div>

        {/* ── Tab Nav ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-0 flex gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors min-h-[44px]
                         focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-inset
                         ${activeTab === item.id
                           ? "text-[#0066FF] border-b-2 border-[#0066FF] bg-[#0066FF]/5"
                           : "text-[#6B7280] hover:text-[#9CA3AF]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Error Banner ── */}
        {fetchError && (
          <div className="mb-6 p-4 rounded-xl border border-[#FFB800]/30 bg-[#FFB800]/10 text-[#FFB800] text-sm flex items-start gap-3">
            <span className="shrink-0">⚠</span>
            <div>
              <p className="font-medium">Serviço temporariamente indisponível</p>
              <p className="text-[#FFB800]/80 text-xs mt-0.5">{fetchError}</p>
              <button
                onClick={() => void fetchAll()}
                className="mt-2 text-xs underline focus-visible:ring-1 focus-visible:ring-[#FFB800] rounded"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <>
            {authLoading || dataLoading ? (
              <DashboardSkeleton />
            ) : !hasAccounts ? (
              <EmptyState onNavigate={setActiveTab} />
            ) : (
              <div className="space-y-8">

                {/* ── TIER 1: KPIs ── */}
                <section aria-label="KPIs críticos">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                      label="Custo Total Mensal"
                      value={`$${(summary?.total_monthly_cost_usd ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                      sub={`${summary?.total_accounts ?? 0} conta${(summary?.total_accounts ?? 0) !== 1 ? "s" : ""}`}
                      icon="💳"
                      accent="default"
                    />
                    <KpiCard
                      label="Economia Potencial"
                      value={`$${(summary?.potential_savings_usd ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                      sub="em recomendações pendentes"
                      icon="💡"
                      accent="success"
                    />
                    <KpiCard
                      label="Alertas Críticos"
                      value={String(summary?.critical_alerts ?? 0)}
                      sub="anomalias ativas"
                      icon="🚨"
                      accent={summary?.critical_alerts ? "danger" : "default"}
                    />
                    <KpiCard
                      label="Economia Implementada"
                      value={`$${(summary?.implemented_savings_usd ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                      sub="acumulado no mês"
                      icon="✅"
                      accent="success"
                    />
                  </div>
                </section>

                {/* ── TIER 2: Gráficos ── */}
                <section aria-label="Análise de custos" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <CostTrendChart data={trends} loading={false} />
                  </div>
                  <ProviderBreakdown
                    data={summary?.cost_by_provider ?? { aws: 0, gcp: 0, azure: 0 }}
                    loading={false}
                  />
                </section>

                {/* ── TIER 3: Anomalias + Recomendações ── */}
                <section aria-label="Anomalias e recomendações" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnomalyList anomalies={anomalies} loading={false} />
                  <RecommendationsCritical
                    recs={recs}
                    loading={false}
                    onUpdateStatus={updateRecStatus}
                  />
                </section>
              </div>
            )}
          </>
        )}

        {/* ── Accounts Tab ── */}
        {activeTab === "accounts" && (
          (authLoading || dataLoading)
            ? <div className="space-y-3"><SkeletonList rows={3} /></div>
            : <AccountsTab accounts={accounts} onRefresh={fetchAll} apiFetch={apiFetch} />
        )}

        {/* ── Recs Tab ── */}
        {activeTab === "recs" && (
          (authLoading || dataLoading)
            ? <SkeletonList rows={6} />
            : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => void generateRecs()}
                    className="px-4 py-2.5 rounded-xl bg-[#0066FF] text-white text-sm font-medium
                               hover:bg-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0066FF]
                               focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]
                               transition-colors min-h-[44px]"
                  >
                    Gerar Recomendações
                  </button>
                </div>
                <RecommendationsCritical
                  recs={recs}
                  loading={false}
                  onUpdateStatus={updateRecStatus}
                />
              </div>
            )
        )}
      </main>
    </div>
  );
}
