"use client"

import { useState } from "react"
import { X, Cloud, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Provider = "gcp" | "azure"

const PROVIDERS: { id: Provider; label: string; description: string }[] = [
  { id: "gcp",   label: "Google Cloud Platform", description: "Autentique com Service Account JSON" },
  { id: "azure", label: "Microsoft Azure",      description: "Use App Registration + Client Secret" },
]

interface AddAccountModalProps {
  open: boolean
  onClose: () => void
  onAdd?: (provider: Provider, name: string) => void
}

export function AddAccountModal({ open, onClose, onAdd }: AddAccountModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selected, setSelected] = useState<Provider | null>(null)
  const [name, setName] = useState("")
  const [credentials, setCredentials] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function handleClose() {
    setStep(1)
    setSelected(null)
    setName("")
    setCredentials("")
    setLoading(false)
    setDone(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !name) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    setDone(true)
    setTimeout(() => {
      onAdd?.(selected, name)
      handleClose()
    }, 1000)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div>
              <h2 id="modal-title" className="text-base font-semibold text-foreground">
                Adicionar Conta Cloud
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === 1 ? "Escolha o provedor" : "Configure as credenciais"}
              </p>
            </div>
            <button
              onClick={handleClose}
              aria-label="Fechar"
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {done ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="size-12 rounded-full bg-success/15 flex items-center justify-center">
                  <Check className="size-6 text-success" />
                </div>
                <p className="text-sm font-medium text-foreground">Conta conectada com sucesso!</p>
                <p className="text-xs text-muted-foreground">{name} foi adicionada ao seu workspace.</p>
              </div>
            ) : step === 1 ? (
              <div className="space-y-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p.id)}
                    className={cn(
                      "w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150",
                      selected === p.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary hover:border-[oklch(1_0_0/0.15)]"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 size-8 rounded-lg flex items-center justify-center shrink-0",
                        selected === p.id ? "bg-primary/20" : "bg-muted"
                      )}
                    >
                      <Cloud
                        className={cn(
                          "size-4",
                          selected === p.id ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                    {selected === p.id && (
                      <Check className="size-4 text-primary ml-auto shrink-0 mt-1" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <form id="add-account-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="acc-name" className="text-xs font-medium text-foreground">
                    Nome da conta
                  </label>
                  <input
                    id="acc-name"
                    type="text"
                    placeholder="ex: Produção AWS"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="acc-creds" className="text-xs font-medium text-foreground">
                    Credenciais (JSON / ARN / Client Secret)
                  </label>
                  <textarea
                    id="acc-creds"
                    rows={4}
                    placeholder="Cole aqui suas credenciais..."
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all duration-150"
                  />
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          {!done && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              {step === 2 ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  Voltar
                </button>
              ) : (
                <span />
              )}

              {step === 1 ? (
                <button
                  type="button"
                  disabled={!selected}
                  onClick={() => setStep(2)}
                  className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-all duration-150 active:scale-[0.98]"
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="submit"
                  form="add-account-form"
                  disabled={!name || loading}
                  className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-all duration-150 active:scale-[0.98] flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                          strokeDasharray="31.4" strokeDashoffset="10" />
                      </svg>
                      Conectando…
                    </>
                  ) : (
                    "Conectar"
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
