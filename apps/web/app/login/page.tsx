"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Cloud, Zap, Shield, BarChart3, ArrowLeft } from "lucide-react"
import { Logo } from "@/components/logo"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email || !password) {
      setError("Preencha e-mail e senha.")
      return
    }
    setLoading(true)
    const sb = createClient()
    const { error: authError } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      setError(authError.message === "Invalid login credentials" ? "E-mail ou senha inválidos." : authError.message)
      return
    }
    router.push("/dashboard")
  }

  async function handleOAuth(provider: "google" | "github") {
    setError("")
    setOauthLoading(provider)
    const sb = createClient()
    const { error: oauthError } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (oauthError) {
      setError(oauthError.message)
      setOauthLoading(null)
    }
  }

  return (
    <main className="min-h-[100dvh] bg-background flex">
      {/* Painel esquerdo — visual */}
      <aside className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-card border-r border-border p-10 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,oklch(1 0 0) 0,oklch(1 0 0) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,oklch(1 0 0) 0,oklch(1 0 0) 1px,transparent 1px,transparent 40px)",
          }}
        />
        <div className="relative z-10">
          <Logo iconSize={36} variant="default" />
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-2xl font-semibold text-foreground leading-snug text-balance">
            Visibilidade total dos seus custos cloud em um só lugar.
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: BarChart3, label: "Custo mensal monitorado", value: "R$ 4,2 M", color: "text-chart-1", bg: "bg-[oklch(0.60_0.22_264/0.12)]" },
              { icon: Zap,       label: "Anomalias detectadas",    value: "23 hoje",   color: "text-warning",  bg: "bg-[oklch(0.75_0.18_75/0.12)]"  },
              { icon: Shield,    label: "Contas conectadas",       value: "12 provedores", color: "text-success", bg: "bg-[oklch(0.68_0.18_145/0.12)]" },
              { icon: Cloud,     label: "Economia identificada",   value: "R$ 380 K",  color: "text-chart-2",  bg: "bg-[oklch(0.72_0.15_194/0.12)]"  },
            ].map(({ icon: Icon, label, value, color, bg }, i) => (
              <div key={label} className="card-enter rounded-xl border border-border p-4 space-y-2 hover:border-[oklch(1_0_0/0.15)] transition-colors duration-150" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`size-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{label}</p>
                <p className={`text-lg font-semibold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground relative z-10">© 2025 OptiCloud AI. Todos os direitos reservados.</p>
      </aside>

      {/* Painel direito — formulário */}
      <section className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden mb-2 flex items-center justify-between">
            <Logo iconSize={32} variant="default" />
            <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-3.5" />
              Voltar
            </Link>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Entrar na sua conta</h1>
            <p className="text-sm text-muted-foreground">Insira suas credenciais para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
              <input
                id="email" type="email" autoComplete="email" placeholder="voce@empresa.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
                <button type="button" className="text-xs text-primary hover:underline transition-all duration-150">Esqueceu a senha?</button>
              </div>
              <div className="relative">
                <input
                  id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-input px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150"
                />
                <button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && <p role="alert" className="text-xs text-danger font-medium">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10" />
                  </svg>
                  Entrando…
                </span>
              ) : "Entrar"}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou continue com</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleOAuth("google")} disabled={oauthLoading !== null}
              className="h-10 rounded-lg border border-border bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {oauthLoading === "google" ? (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path fill="currentColor" d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748z" /></svg>
              )}
              Google
            </button>
            <button type="button" onClick={() => handleOAuth("github")} disabled={oauthLoading !== null}
              className="h-10 rounded-lg border border-border bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {oauthLoading === "github" ? (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" /></svg>
              )}
              GitHub
            </button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link href="/login" className="text-primary hover:underline transition-all duration-150">Criar conta grátis</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
