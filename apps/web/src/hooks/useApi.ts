"use client";
import { useCallback, useState } from "react";
import type { ApiResult } from "@repo/types";
import { createClient } from "../lib/supabase";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  const sb = createClient();
  const { data: { session } } = await sb.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const json = await res.json() as ApiResult<T>;
  return json;
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async <T>(path: string, options?: RequestInit): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<T>(path, options);
      if (result.error) {
        setError(result.error.message);
        return null;
      }
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { call, loading, error };
}
