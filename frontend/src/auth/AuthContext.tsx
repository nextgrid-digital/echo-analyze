import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { AuthContext, type AuthContextValue } from "@/auth/auth-context"
import {
  getSupabaseAuthHost,
  getSupabaseClient,
  getUsernameFromUser,
  isSupabaseAdminUser,
  isSupabaseConfigured,
  type Session,
} from "@/lib/supabase"

function formatAuthError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback
  }

  const message = error.message || fallback
  const lowerMessage = message.toLowerCase()
  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("networkerror") ||
    lowerMessage.includes("load failed")
  ) {
    return `Could not reach Supabase Auth at ${getSupabaseAuthHost()}. If this is not your project host ending in .supabase.co, restart the dev server/rebuild static files. If it is correct, check browser blocking for supabase.co.`
  }

  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isMounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return
        setSession(data.session)
      })
      .catch(() => {
        if (!isMounted) return
        setSession(null)
      })
      .finally(() => {
        if (!isMounted) return
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const user = session?.user ?? null

  const value = useMemo<AuthContextValue>(() => {
    return {
      configured,
      loading,
      session,
      user,
      username: getUsernameFromUser(user),
      isAdmin: isSupabaseAdminUser(user),
      async signIn(email: string, password: string) {
        if (!supabase) {
          throw new Error("Supabase is not configured.")
        }
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) {
            throw error
          }
        } catch (error) {
          throw new Error(formatAuthError(error, "Authentication failed."))
        }
      },
      async signInWithGoogle() {
        if (!supabase) {
          throw new Error("Supabase is not configured.")
        }
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: window.location.origin,
              queryParams: {
                access_type: "offline",
                prompt: "select_account",
              },
            },
          })
          if (error) {
            throw error
          }
        } catch (error) {
          throw new Error(formatAuthError(error, "Google sign-in failed."))
        }
      },
      async signUp(email: string, password: string, username: string) {
        if (!supabase) {
          throw new Error("Supabase is not configured.")
        }
        try {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
              data: {
                username,
              },
            },
          })
          if (error) {
            throw error
          }
        } catch (error) {
          throw new Error(formatAuthError(error, "Account creation failed."))
        }
      },
      async signOut() {
        if (!supabase) {
          return
        }
        try {
          const { error } = await supabase.auth.signOut()
          if (error) {
            throw error
          }
        } catch (error) {
          throw new Error(formatAuthError(error, "Sign out failed."))
        }
      },
    }
  }, [configured, loading, session, supabase, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
