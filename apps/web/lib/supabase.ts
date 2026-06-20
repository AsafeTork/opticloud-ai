"use client"
import { createBrowserClient } from "@supabase/ssr"

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? ""
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? ""

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export function createClient() {
  if (!isConfigured) {
    return createBrowserClient("https://placeholder.supabase.co", "placeholder-key")
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
