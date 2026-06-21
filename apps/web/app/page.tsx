import Link from "next/link"
import { Logo } from "@/components/logo"
import { BarChart3, Zap, Sparkles, Cloud, Server, ArrowRight } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo iconSize={28} variant="default" />
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="h-9 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all duration-150 flex items-center"
            >
              Começar grátis
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-8">
            <Sparkles className="size-3 text-primary" />
            Powered by IA · GCP + Azure
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight text-balance mb-6 leading-tight">
            Controle total dos seus{" "}
            <span className="text-primary">custos em nuvem.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 text-balance">
            Monitore, detecte anomalias e receba recomendações de IA para reduzir
            gastos em GCP e Azure — tudo em um único painel.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/login"
              className="h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all duration-150 flex items-center gap-2"
            >
              Começar grátis
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="h-11 px-6 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-accent transition-all duration-150"
            >
              Ver demonstração
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-border bg-card/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "R$ 4,2 M", label: "monitorados / mês" },
              { value: "23",       label: "anomalias detectadas" },
              { value: "R$ 380 K", label: "economia identificada" },
              { value: "12",       label: "provedores conectados" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-2xl font-semibold text-foreground text-center mb-12">
            Tudo que você precisa para otimizar a nuvem
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                color: "text-chart-1",
                bg: "bg-[oklch(0.60_0.22_264/0.12)]",
                title: "Visibilidade completa",
                desc: "Painel unificado com todos os seus custos AWS, GCP e Azure em tempo real.",
              },
              {
                icon: Zap,
                color: "text-warning",
                bg: "bg-[oklch(0.75_0.18_75/0.12)]",
                title: "Detecção de anomalias",
                desc: "IA identifica picos de gasto fora do padrão e alerta antes que se tornem problemas.",
              },
              {
                icon: Sparkles,
                color: "text-primary",
                bg: "bg-[oklch(0.60_0.22_264/0.12)]",
                title: "Recomendações IA",
                desc: "Sugestões automáticas de rightsizing, reservas e eliminação de recursos ociosos.",
              },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6 space-y-4 hover:border-[oklch(1_0_0/0.12)] transition-colors duration-150"
              >
                <div className={`size-10 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`size-5 ${color}`} />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Clouds */}
        <section className="border-t border-border bg-card/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8">
              Provedores suportados
            </p>
            <div className="flex items-center justify-center gap-10 flex-wrap">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Cloud className="size-5" />
                <span className="font-medium text-sm">Google Cloud</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Server className="size-5" />
                <span className="font-medium text-sm">Microsoft Azure</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4 text-balance">
            Pronto para reduzir seus custos?
          </h2>
          <p className="text-muted-foreground mb-8">
            Crie sua conta gratuitamente e conecte sua primeira conta cloud em menos de 2 minutos.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 h-11 px-8 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all duration-150"
          >
            Começar grátis
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">© 2025 OptiCloud AI. Todos os direitos reservados.</p>
          <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Entrar
          </Link>
        </div>
      </footer>
    </div>
  )
}
