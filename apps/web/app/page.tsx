"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, isConfigured } from "../src/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode]         = useState<"login" | "signup">("login");
  const [loading, setLoading]   = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/dashboard");
    }).catch(() => null);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    const sb = createClient();
    try {
      if (mode === "signup") {
        const { error: err } = await sb.auth.signUp({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await sb.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    if (oauthLoading) return;
    setOauthLoading(provider);
    setError(null);
    try {
      const sb = createClient();
      const { error: err } = await sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Erro ao entrar com ${provider}`);
      setOauthLoading(null);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#0F1117" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: "linear-gradient(135deg, #0066FF, #0052CC)" }}
            >
              O
            </div>
            <span className="text-2xl font-bold text-[#E5E7EB]">OptiCloud AI</span>
          </div>
          <p className="text-sm text-[#6B7280]">Otimização de nuvem com inteligência artificial</p>
        </div>

        {!isConfigured && (
          <div className="mb-4 p-4 rounded-xl border border-[#FFB800]/30 bg-[#FFB800]/10 text-[#FFB800] text-sm text-center">
            ⚙️ Serviço em configuração — tente novamente em instantes.
          </div>
        )}

        <div className="rounded-2xl border border-[#2A2D3E] bg-[#1A1D27] p-8">
          <h1 className="text-lg font-semibold text-[#E5E7EB] mb-6">
            {mode === "login" ? "Entrar na sua conta" : "Criar conta grátis"}
          </h1>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-[#FF4757]/30 bg-[#FF4757]/10 text-[#FF4757] text-sm">
              {error}
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => void handleOAuth("google")}
              disabled={!!oauthLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                         border border-[#2A2D3E] bg-[#0F1117] text-[#E5E7EB] text-sm font-medium
                         hover:bg-[#222535] hover:border-[#3A3D4E] disabled:opacity-50
                         focus-visible:ring-2 focus-visible:ring-[#0066FF] transition-colors min-h-[48px]"
            >
              {oauthLoading === "google" ? (
                <span className="text-[#9CA3AF]">Redirecionando...</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continuar com Google
                </>
              )}
            </button>

            <button
              onClick={() => void handleOAuth("github")}
              disabled={!!oauthLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                         border border-[#2A2D3E] bg-[#0F1117] text-[#E5E7EB] text-sm font-medium
                         hover:bg-[#222535] hover:border-[#3A3D4E] disabled:opacity-50
                         focus-visible:ring-2 focus-visible:ring-[#0066FF] transition-colors min-h-[48px]"
            >
              {oauthLoading === "github" ? (
                <span className="text-[#9CA3AF]">Redirecionando...</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#E5E7EB">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continuar com GitHub
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#2A2D3E]" />
            <span className="text-xs text-[#4B5563]">ou use e-mail</span>
            <div className="flex-1 h-px bg-[#2A2D3E]" />
          </div>

          {/* Email/password form */}
          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl border border-[#2A2D3E] bg-[#0F1117]
                           text-sm text-[#E5E7EB] placeholder-[#4B5563]
                           focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]
                           transition-colors min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-[#2A2D3E] bg-[#0F1117]
                           text-sm text-[#E5E7EB] placeholder-[#4B5563]
                           focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]
                           transition-colors min-h-[48px]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#0066FF] text-white text-sm font-semibold
                         hover:bg-[#0052CC] disabled:opacity-50 disabled:cursor-not-allowed
                         focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2
                         focus-visible:ring-offset-[#1A1D27] transition-colors min-h-[48px]"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-[#6B7280]">
            {mode === "login" ? (
              <>Não tem conta?{" "}
                <button
                  onClick={() => { setMode("signup"); setError(null); }}
                  className="text-[#0066FF] hover:text-[#3385FF] focus-visible:underline"
                >
                  Criar grátis
                </button>
              </>
            ) : (
              <>Já tem conta?{" "}
                <button
                  onClick={() => { setMode("login"); setError(null); }}
                  className="text-[#0066FF] hover:text-[#3385FF] focus-visible:underline"
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
