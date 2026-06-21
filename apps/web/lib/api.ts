import { createClient } from "@/lib/supabase"

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "https://opticloud-api.onrender.com"
const TIMEOUT_MS = 15_000

async function getToken(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const t = await getToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(init.headers ?? {}),
      },
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json.data ?? null) as T | null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
