"use client"

import { useReducer, useEffect, useRef } from "react"
import { X, Cloud, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import type { CloudProvider, CreateCloudAccountPayload } from "@repo/types"

type Step = 1 | 2

interface FormState {
  step: Step
  provider: CloudProvider
  name: string
  accountId: string
  submitting: boolean
  done: boolean
  error: string | null
}

type Action =
  | { type: "SELECT_PROVIDER"; provider: CloudProvider }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_NAME"; value: string }
  | { type: "SET_ACCOUNT_ID"; value: string }
  | { type: "SUBMIT" }
  | { type: "SUCCESS" }
  | { type: "ERROR"; message: string }
  | { type: "RESET" }

const INITIAL: FormState = {
  step: 1,
  provider: "gcp",
  name: "",
  accountId: "",
  submitting: false,
  done: false,
  error: null,
}

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "SELECT_PROVIDER":
      return { ...state, provider: action.provider, error: null }
    case "NEXT_STEP":
      return { ...state, step: 2, error: null }
    case "PREV_STEP":
      return { ...state, step: 1, error: null }
    case "SET_NAME":
      return { ...state, name: action.value, error: null }
    case "SET_ACCOUNT_ID":
      return { ...state, accountId: action.value, error: null }
    case "SUBMIT":
      return { ...state, submitting: true, error: null }
    case "SUCCESS":
      return { ...state, submitting: false, done: true }
    case "ERROR":
      return { ...state, submitting: false, error: action.message }
    case "RESET":
      return INITIAL
  }
}

const PROVIDERS: { id: CloudProvider; label: string; description: string; idLabel: string; placeholder: string; hint: string; link: string }[] = [
  {
    id: "gcp",
    label: "Google Cloud Platform",
    description: "Conecte via Project ID",
    idLabel: "Project ID",
    placeholder: "meu-projeto-123",
    hint: "Encontre no seletor de projetos do Console.",
    link: "https://console.cloud.google.com",
  },
  {
    id: "azure",
    label: "Microsoft Azure",
    description: "Conecte via Subscription ID",
    idLabel: "Subscription ID",
    placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    hint: "Encontre em Assinaturas no Portal Azure.",
    link: "https://portal.azure.com/#view/Microsoft_Azure_Billing/SubscriptionsBladeV2",
  },
]

interface Props {
  open: boolean
  onClose: () => void
  onAdd?: (provider: CloudProvider, name: string) => void
}

export function AddAccountModal({ open, onClose, onAdd }: Props) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) dispatch({ type: "RESET" })
  }, [open])

  useEffect(() => {
    if (state.step === 2) setTimeout(() => nameInputRef.current?.focus(), 50)
  }, [state.step])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const provider = PROVIDERS.find((p) => p.id === state.provider)!

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state.submitting) return

    const name = state.name.trim()
    const accountId = state.accountId.trim()
    if (!name || !accountId) {
      dispatch({ type: "ERROR", message: "Preencha todos os campos." })
      return
    }

    dispatch({ type: "SUBMIT" })

    const payload: CreateCloudAccountPayload = {
      provider: state.provider,
      account_id: accountId,
      account_name: name,
    }

    try {
      const result = await apiFetch<unknown>("/api/accounts", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (result === null) {
        dispatch({ type: "ERROR", message: "Erro ao conectar a conta. Verifique se o ID já está cadastrado." })
        return
      }

      dispatch({ type: "SUCCESS" })
      onAdd?.(state.provider, name)
      setTimeout(onClose, 1200)
    } catch {
      dispatch({ type: "ERROR", message: "Erro de conexão. Verifique sua rede." })
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

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
                {state.step === 1 ? "Escolha o provedor" : "Configure a conta"}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {state.done ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="size-12 rounded-full bg-success/15 flex items-center justify-center">
                  <Check className="size-6 text-success" />
                </div>
                <p className="text-sm font-medium text-foreground">Conta conectada!</p>
                <p className="text-xs text-muted-foreground">{state.name} foi adicionada ao seu workspace.</p>
              </div>
            ) : state.step === 1 ? (
              <div className="space-y-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => dispatch({ type: "SELECT_PROVIDER", provider: p.id })}
                    className={cn(
                      "w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                      state.provider === p.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary hover:border-muted-foreground/30"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 size-8 rounded-lg flex items-center justify-center shrink-0",
                      state.provider === p.id ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Cloud className={cn("size-4", state.provider === p.id ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                    {state.provider === p.id && (
                      <Check className="size-4 text-primary ml-auto shrink-0 mt-1" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <form id="add-account-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="acc-name" className="text-xs font-medium text-foreground">
                    Nome amigável
                  </label>
                  <input
                    ref={nameInputRef}
                    id="acc-name"
                    type="text"
                    placeholder={`Ex: ${provider.id === "gcp" ? "GCP Produção" : "Azure Infra"}`}
                    value={state.name}
                    onChange={(e) => dispatch({ type: "SET_NAME", value: e.target.value })}
                    className="w-full h-10 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150"
                    maxLength={256}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="acc-id" className="text-xs font-medium text-foreground">
                    {provider.idLabel}
                  </label>
                  <input
                    id="acc-id"
                    type="text"
                    placeholder={provider.placeholder}
                    value={state.accountId}
                    onChange={(e) => dispatch({ type: "SET_ACCOUNT_ID", value: e.target.value })}
                    className="w-full h-10 rounded-lg border border-border bg-input px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={128}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {provider.hint}{" "}
                    <a
                      href={provider.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline underline-offset-2"
                    >
                      Abrir console →
                    </a>
                  </p>
                </div>

                {state.error && (
                  <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                    {state.error}
                  </p>
                )}
              </form>
            )}
          </div>

          {/* Footer */}
          {!state.done && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              {state.step === 2 ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "PREV_STEP" })}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  Voltar
                </button>
              ) : (
                <span />
              )}

              {state.step === 1 ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "NEXT_STEP" })}
                  className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="submit"
                  form="add-account-form"
                  disabled={!state.name.trim() || !state.accountId.trim() || state.submitting}
                  className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-all duration-150 active:scale-[0.98] flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {state.submitting ? (
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
