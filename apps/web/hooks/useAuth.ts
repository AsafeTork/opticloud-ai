"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const sb = createClient()

    sb.auth.getSession().then(({ data }) => {
      if (mounted.current) {
        setUser(data.session?.user ?? null)
        setLoading(false)
      }
    }).catch(() => {
      if (mounted.current) setLoading(false)
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (mounted.current) setUser(session?.user ?? null)
    })

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await createClient().auth.signOut()
  }, [])

  return { user, loading, signOut }
}
