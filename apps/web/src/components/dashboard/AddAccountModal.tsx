"use client";

import { useReducer, useRef, useEffect } from "react";
import type { CloudProvider } from "@repo/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T | null>;
}

interface FormState {
  provider: CloudProvider;
  account_id: string;
  account_name: string;
  submitting: boolean;
  error: string | null;
}

type Action =
  | { type: "SET_FIELD"; field: keyof Pick<FormState, "provider" | "account_id" | "account_name">; value: string }
  | { type: "SUBMIT" }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

const INITIAL: FormState = {
  provider: "gcp",
  account_id: "",
  account_name: "",
  submitting: false,
  error: null,
};

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value, error: null };
    case "SUBMIT":
      return { ...state, submitting: true, error: null };
    case "ERROR":
      return { ...state, submitting: false, error: action.message };
    case "RESET":
      return INITIAL;
  }
}

const PROVIDERS: { value: CloudProvider; label: string; placeholder: string; hint: string; link: string; linkLabel: string }[] = [
  {
    value: "gcp",
    label: "GCP",
    placeholder: "meu-projeto-123",
    hint: "Project ID — encontre no seletor de projetos do Console.",
    link: "https://console.cloud.google.com",
    linkLabel: "Abrir Google Cloud Console →",
  },
  {
    value: "azure",
    label: "Azure",
    placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    hint: "Subscription ID — encontre em Assinaturas no Portal.",
    link: "https://portal.azure.com/#view/Microsoft_Azure_Billing/SubscriptionsBladeV2",
    linkLabel: "Abrir Portal Azure →",
  },
];

export function AddAccountModal({ open, onClose, onSuccess, apiFetch }: Props) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      dispatch({ type: "RESET" });
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const provider = PROVIDERS.find((p) => p.value === state.provider)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.submitting) return;

    const id = state.account_id.trim();
    const name = state.account_name.trim();
    if (!id || !name) {
      dispatch({ type: "ERROR", message: "Preencha todos os campos." });
      return;
    }

    dispatch({ type: "SUBMIT" });

    const result = await apiFetch<unknown>("/api/accounts", {
      method: "POST",
      body: JSON.stringify({ provider: state.provider, account_id: id, account_name: name }),
    });

    if (!result) {
      dispatch({ type: "ERROR", message: "Erro ao conectar a conta. Verifique se o ID já está cadastrado." });
      return;
    }

    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-[#2A2D3E] bg-[#1A1D27] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2D3E]">
          <h2 id="modal-title" className="text-base font-semibold text-[#E5E7EB]">
            Conectar Conta Cloud
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280]
                       hover:text-[#E5E7EB] hover:bg-[#2A2D3E] transition-colors
                       focus-visible:ring-2 focus-visible:ring-[#0066FF]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5">
          {/* Provider selector */}
          <fieldset>
            <legend className="text-xs font-medium text-[#9CA3AF] mb-2">Provedor</legend>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => dispatch({ type: "SET_FIELD", field: "provider", value: p.value })}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all
                             focus-visible:ring-2 focus-visible:ring-[#0066FF] min-h-[48px]
                             ${state.provider === p.value
                               ? "border-[#0066FF] bg-[#0066FF]/15 text-[#0066FF]"
                               : "border-[#2A2D3E] text-[#6B7280] hover:text-[#E5E7EB] hover:border-[#3A3D4E]"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Account ID */}
          <div>
            <label htmlFor="account_id" className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
              {state.provider === "gcp" ? "Project ID" : "Subscription ID"}
            </label>
            <input
              ref={firstInputRef}
              id="account_id"
              type="text"
              value={state.account_id}
              onChange={(e) => dispatch({ type: "SET_FIELD", field: "account_id", value: e.target.value })}
              placeholder={provider.placeholder}
              className="w-full px-3 py-2.5 rounded-xl border border-[#2A2D3E] bg-[#0F1117]
                         text-sm text-[#E5E7EB] placeholder-[#4B5563]
                         focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]
                         transition-colors min-h-[48px]"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-[10px] text-[#6B7280] mt-1">
              {provider.hint}{" "}
              <a
                href={provider.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0066FF] hover:text-[#3385FF] underline-offset-2 hover:underline"
              >
                {provider.linkLabel}
              </a>
            </p>
          </div>

          {/* Account Name */}
          <div>
            <label htmlFor="account_name" className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
              Nome amigável
            </label>
            <input
              id="account_name"
              type="text"
              value={state.account_name}
              onChange={(e) => dispatch({ type: "SET_FIELD", field: "account_name", value: e.target.value })}
              placeholder={`Ex: ${state.provider === "gcp" ? "GCP Analytics" : "Azure Infra"}`}
              className="w-full px-3 py-2.5 rounded-xl border border-[#2A2D3E] bg-[#0F1117]
                         text-sm text-[#E5E7EB] placeholder-[#4B5563]
                         focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]
                         transition-colors min-h-[48px]"
              maxLength={256}
            />
          </div>

          {/* Error */}
          {state.error && (
            <p className="text-xs text-[#FF4757] bg-[#FF4757]/10 border border-[#FF4757]/30 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#2A2D3E] text-sm text-[#9CA3AF]
                         hover:text-[#E5E7EB] hover:border-[#3A3D4E] transition-colors
                         focus-visible:ring-2 focus-visible:ring-[#0066FF] min-h-[48px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={state.submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#0066FF] text-white text-sm font-medium
                         hover:bg-[#0052CC] disabled:opacity-50 disabled:cursor-not-allowed
                         focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2
                         focus-visible:ring-offset-[#1A1D27] transition-colors min-h-[48px]"
            >
              {state.submitting ? "Conectando..." : "Conectar conta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
