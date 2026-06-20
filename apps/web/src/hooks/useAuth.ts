"use client";
import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();

    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const sb = createClient();
    await sb.auth.signOut();
  }, []);

  return { user, loading, signOut };
}
