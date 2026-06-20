"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, isConfigured } from "../src/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/dashboard");
    }).catch(() => null);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const sb = createClient();

    try {
      if (mode === "signup") {
        const { error: err } = await sb.auth.signUp({ email, password });
        if (err) throw err;
        setMessage("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        const { error: err } = await sb.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">O</div>
            <span className="text-2xl font-bold text-white">OptiCloud AI</span>
          </div>
          <p className="text-gray-400">Otimização de nuvem com inteligência artificial</p>
        </div>

        {!isConfigured && (
          <div className="mb-4 p-4 bg-yellow-900/50 border border-yellow-700 rounded-xl text-yellow-300 text-sm text-center">
            ⚙️ Serviço em configuração — tente novamente em instantes.
          </div>
        )}

        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <h1 className="text-xl font-semibold text-white mb-6">
            {mode === "login" ? "Entrar na sua conta" : "Criar conta grátis"}
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">{message}</div>
          )}

          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            {mode === "login" ? (
              <>Não tem conta?{" "}
                <button onClick={() => setMode("signup")} className="text-blue-400 hover:text-blue-300 focus-visible:underline">Criar grátis</button>
              </>
            ) : (
              <>Já tem conta?{" "}
                <button onClick={() => setMode("login")} className="text-blue-400 hover:text-blue-300 focus-visible:underline">Entrar</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
