"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/hooks/useAuth";
import { createClient } from "../../src/lib/supabase";
import type { DashboardSummary, CloudAccount, Recommendation } from "@repo/types";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
const TIMEOUT_MS = 15_000;

// ─── Fetch helper (local — não usa o hook para evitar loading compartilhado) ──

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-28 bg-gray-800 border border-gray-700 rounded-xl animate-pulse" />;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-900/30 border-red-800",
  high: "text-orange-400 bg-orange-900/30 border-orange-800",
  medium: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
  low: "text-green-400 bg-green-900/30 border-green-800",
};

const PROVIDER_LABELS: Record<string, string> = { aws: "AWS", gcp: "GCP", azure: "Azure" };

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "accounts" | "recs">("overview");

  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    setFetchError(null);
    const [s, a, r] = await Promise.all([
      apiFetch<DashboardSummary>("/api/dashboard/summary"),
      apiFetch<CloudAccount[]>("/api/accounts"),
      apiFetch<Recommendation[]>("/api/recommendations"),
    ]);
    if (s) setSummary(s);
    if (a) setAccounts(a);
    if (r) setRecs(r);
    if (!s && !a && !r) setFetchError("Não foi possível carregar os dados. A API pode estar iniciando (aguarde 30s).");
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/"); return; }
    if (user) void fetchAll();
  }, [user, authLoading, router, fetchAll]);

  async function updateRecStatus(id: string, status: Recommendation["status"]) {
    const updated = await apiFetch<Recommendation>(`/api/recommendations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (updated) {
      setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    }
  }

  async function generateRecs() {
    await apiFetch("/api/recommendations/generate", { method: "POST" });
    void fetchAll();
  }

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-12 w-48 bg-gray-800 rounded-xl animate-pulse mb-8" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
          <div className="h-64 bg-gray-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">O</div>
            <span className="text-lg font-semibold">OptiCloud AI</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <button
              onClick={() => { void signOut().then(() => router.push("/")); }}
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {fetchError && (
          <div className="mb-6 p-4 bg-yellow-900/40 border border-yellow-700 rounded-xl text-yellow-300 text-sm flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-medium">Serviço temporariamente indisponível</p>
              <p className="text-yellow-400">{fetchError}</p>
              <button onClick={() => void fetchAll()} className="mt-2 text-yellow-200 underline text-xs">Tentar novamente</button>
            </div>
          </div>
        )}

        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl mb-8 w-fit">
          {(["overview", "accounts", "recs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeTab === tab ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {tab === "overview" ? "Visão Geral" : tab === "accounts" ? "Contas" : "Recomendações"}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <OverviewTab summary={summary} onNavigate={setActiveTab} />
        )}
        {activeTab === "accounts" && (
          <AccountsTab accounts={accounts} onRefresh={fetchAll} />
        )}
        {activeTab === "recs" && (
          <RecsTab recs={recs} onUpdateStatus={updateRecStatus} onGenerate={generateRecs} />
        )}
      </main>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  summary,
  onNavigate,
}: {
  summary: DashboardSummary | null;
  onNavigate: (tab: "accounts") => void;
}) {
  if (!summary || summary.total_accounts === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
        <p className="text-4xl mb-4">☁️</p>
        <h2 className="text-lg font-semibold text-white mb-2">Nenhuma conta conectada</h2>
        <p className="text-gray-400 mb-6">Adicione suas contas cloud para começar a otimizar custos.</p>
        <button
          onClick={() => onNavigate("accounts")}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors min-h-[44px]"
        >
          Conectar conta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Contas Cloud" value={String(summary.total_accounts)} />
        <StatCard label="Custo Mensal" value={`$${summary.total_monthly_cost_usd.toFixed(0)}`} accent="text-blue-400" />
        <StatCard
          label="Recomendações Pendentes"
          value={String(summary.pending_recommendations)}
          accent={summary.pending_recommendations > 0 ? "text-yellow-400" : "text-green-400"}
        />
        <StatCard label="Economia Potencial" value={`$${summary.potential_savings_usd.toFixed(0)}`} sub="por mês" accent="text-green-400" />
      </div>

      {summary.pending_recommendations > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">Economia potencial por categoria</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.entries(summary.savings_by_category) as [string, number][]).map(([cat, val]) => (
              <div key={cat} className="text-center p-4 bg-gray-700/50 rounded-lg">
                <p className="text-2xl font-bold text-green-400">${val.toFixed(0)}</p>
                <p className="text-xs text-gray-400 capitalize mt-1">{cat}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Accounts Tab ─────────────────────────────────────────────────────────────

function AccountsTab({ accounts, onRefresh }: { accounts: CloudAccount[]; onRefresh: () => void }) {
  const [provider, setProvider] = useState<"aws" | "gcp" | "azure">("aws");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const deletingRef = useRef<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);

    const result = await apiFetch<CloudAccount>("/api/accounts", {
      method: "POST",
      body: JSON.stringify({ provider, account_id: accountId.trim(), account_name: accountName.trim() }),
    });

    if (result) {
      setAccountId("");
      setAccountName("");
      onRefresh();
    } else {
      setFormError("Erro ao adicionar conta. Verifique se o ID não está duplicado.");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (deletingRef.current.has(id)) return;
    if (!confirm("Remover esta conta cloud? Esta ação não pode ser desfeita.")) return;

    deletingRef.current.add(id);
    setDeletingIds(new Set(deletingRef.current));

    await apiFetch(`/api/accounts/${id}`, { method: "DELETE" });
    deletingRef.current.delete(id);
    setDeletingIds(new Set(deletingRef.current));
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Conectar conta cloud</h2>
        {formError && <p className="text-red-400 text-sm mb-4">{formError}</p>}
        <form onSubmit={(e) => { void handleAdd(e); }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as "aws" | "gcp" | "azure")}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="aws">AWS</option>
            <option value="gcp">GCP</option>
            <option value="azure">Azure</option>
          </select>
          <input
            required value={accountId} onChange={(e) => setAccountId(e.target.value)}
            placeholder="ID da conta (ex: 123456789012)"
            maxLength={128}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <input
            required value={accountName} onChange={(e) => setAccountName(e.target.value)}
            placeholder="Nome descritivo (ex: Produção)"
            maxLength={256}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit" disabled={submitting}
            className="md:col-span-3 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors min-h-[44px]"
          >
            {submitting ? "Adicionando..." : "Adicionar conta"}
          </button>
        </form>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
          <p className="text-gray-400">Nenhuma conta conectada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono bg-gray-700 px-2 py-0.5 rounded text-gray-300 flex-shrink-0">{PROVIDER_LABELS[acc.provider]}</span>
                  <span className="font-medium text-white truncate">{acc.account_name}</span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${acc.status === "active" ? "bg-green-400" : acc.status === "error" ? "bg-red-400" : "bg-yellow-400"}`} />
                </div>
                <p className="text-sm text-gray-400 truncate">
                  ID: {acc.account_id}{acc.monthly_cost_usd != null ? ` · $${acc.monthly_cost_usd}/mês` : ""}
                </p>
              </div>
              <button
                onClick={() => { void handleDelete(acc.id); }}
                disabled={deletingIds.has(acc.id)}
                className="text-gray-400 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
                aria-label="Remover conta"
              >
                {deletingIds.has(acc.id) ? "..." : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recs Tab ─────────────────────────────────────────────────────────────────

function RecsTab({
  recs,
  onUpdateStatus,
  onGenerate,
}: {
  recs: Recommendation[];
  onUpdateStatus: (id: string, status: Recommendation["status"]) => Promise<void>;
  onGenerate: () => Promise<void>;
}) {
  const [generating, setGenerating] = useState(false);
  const updatingRef = useRef<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const pending = recs.filter((r) => r.status === "pending");

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    await onGenerate();
    setGenerating(false);
  }

  async function handleUpdateStatus(id: string, status: Recommendation["status"]) {
    if (updatingRef.current.has(id)) return;
    updatingRef.current.add(id);
    setUpdatingIds(new Set(updatingRef.current));
    await onUpdateStatus(id, status);
    updatingRef.current.delete(id);
    setUpdatingIds(new Set(updatingRef.current));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {pending.length} recomendação{pending.length !== 1 ? "s" : ""} pendente{pending.length !== 1 ? "s" : ""}
        </h2>
        <button
          onClick={() => { void handleGenerate(); }}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
        >
          {generating ? "Analisando..." : "Gerar novas"}
        </button>
      </div>

      {recs.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-white font-medium mb-2">Nenhuma recomendação ainda</p>
          <p className="text-gray-400 text-sm">Conecte uma conta cloud e clique em &quot;Gerar novas&quot; para iniciar a análise.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => (
            <div key={rec.id} className={`border rounded-xl p-5 ${PRIORITY_COLORS[rec.priority] ?? "border-gray-700 bg-gray-800"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded border ${PRIORITY_COLORS[rec.priority]}`}>
                      {rec.priority}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{rec.category}</span>
                    {rec.estimated_savings_usd != null && (
                      <span className="text-xs text-green-400 font-medium">
                        Economia: ${rec.estimated_savings_usd.toFixed(0)}/mês
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      Confiança: {Math.round(rec.ai_confidence * 100)}%
                    </span>
                  </div>
                  <h3 className="font-medium text-white mb-1 break-words">{rec.title}</h3>
                  <p className="text-sm text-gray-300 break-words">{rec.description}</p>
                </div>
                {rec.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { void handleUpdateStatus(rec.id, "applied"); }}
                      disabled={updatingIds.has(rec.id)}
                      className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors min-h-[44px]"
                    >
                      {updatingIds.has(rec.id) ? "..." : "Aplicar"}
                    </button>
                    <button
                      onClick={() => { void handleUpdateStatus(rec.id, "dismissed"); }}
                      disabled={updatingIds.has(rec.id)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors min-h-[44px]"
                    >
                      {updatingIds.has(rec.id) ? "..." : "Ignorar"}
                    </button>
                  </div>
                )}
                {rec.status !== "pending" && (
                  <span className={`text-xs px-2 py-1 rounded border flex-shrink-0 ${
                    rec.status === "applied" ? "text-green-400 border-green-800 bg-green-900/30" :
                    rec.status === "dismissed" ? "text-gray-400 border-gray-700 bg-gray-800" :
                    "text-blue-400 border-blue-800 bg-blue-900/30"
                  } capitalize`}>{rec.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
