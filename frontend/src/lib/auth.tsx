/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react"
import type { Session } from "@supabase/supabase-js"

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"

export interface Profile {
  role: "user" | "admin"
  created_at: string | null
  last_sign_in_at: string | null
}

interface AuthContextValue {
  isConfigured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role, created_at, last_sign_in_at")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    // Missing rows can happen briefly during initial auth bootstrap.
    if (error.code !== "PGRST116") {
      console.error("Failed to load profile", error)
    }
    return null
  }

  if (!data) {
    return null
  }

  return {
    role: data.role === "admin" ? "admin" : "user",
    created_at: data.created_at ?? null,
    last_sign_in_at: data.last_sign_in_at ?? null,
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    const supabase = getSupabaseClient()

    if (!supabase) {
      return
    }

    let isMounted = true

    const syncSession = async (nextSession: Session | null) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)

      if (!nextSession?.user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const nextProfile = await fetchProfile(nextSession.user.id)
      if (!isMounted) {
        return
      }

      setProfile(
        nextProfile ?? {
          role: "user",
          created_at: null,
          last_sign_in_at: null,
        }
      )
      setLoading(false)
    }

    void (async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error("Failed to restore auth session", error)
      }
      await syncSession(data.session ?? null)
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: profile?.role === "admin",
      refreshProfile: async () => {
        const nextUser = session?.user ?? null
        if (!nextUser) {
          setProfile(null)
          return
        }

        const nextProfile = await fetchProfile(nextUser.id)
        setProfile(
          nextProfile ?? {
            role: "user",
            created_at: null,
            last_sign_in_at: null,
          }
        )
      },
      signOut: async () => {
        const supabase = getSupabaseClient()
        if (!supabase) {
          return
        }
        const { error } = await supabase.auth.signOut()
        if (error) {
          throw error
        }
      },
    }),
    [loading, profile, session]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return value
}
