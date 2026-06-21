"use client"
import { useCallback, useState } from "react"
import type { ApiResult } from "@repo/types"
import { createClient } from "@/lib/supabase"

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001"
const REQUEST_TIMEOUT_MS = 15_000

async function apiFetch<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  const token = session?.access_token

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null) as ApiResult<T> | null
      if (body && "error" in body && body.error) return body
      return { data: null, error: { code: `HTTP_${res.status}`, message: `Request failed (${res.status})` } }
    }

    return await res.json() as ApiResult<T>
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { data: null, error: { code: "TIMEOUT", message: "Tempo esgotado. Tente novamente em instantes." } }
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const call = useCallback(async <T>(path: string, options?: RequestInit): Promise<T | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<T>(path, options)
      if ("error" in result && result.error) {
        setError(result.error.message)
        return null
      }
      return (result as { data: T }).data
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de conexão. Verifique sua rede."
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { call, loading, error }
}
