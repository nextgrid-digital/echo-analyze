import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { apiFetch, readJson } from "@/api/client"
import { AuthContext, type AuthContextValue } from "@/auth/auth-context"
import {
  getSupabaseAuthHost,
  getSupabaseClient,
  getUsernameFromUser,
  isSupabaseAdminUser,
  isSupabaseConfigured,
  type Session,
} from "@/lib/supabase"

interface ServerAuthContext {
  token: string
  username: string
  isAdmin: boolean
}

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
  const [serverAuth, setServerAuth] = useState<ServerAuthContext | null>(null)
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
  const accessToken = session?.access_token ?? null
  const serverAuthLoaded = !accessToken || serverAuth?.token === accessToken

  useEffect(() => {
    if (!accessToken) {
      setServerAuth(null)
      return
    }

    let isCancelled = false
    const token = accessToken
    setServerAuth(null)

    async function loadServerAuth() {
      try {
        const response = await apiFetch("/api/auth/me", { method: "GET" })
        const payload = await readJson<{
          username?: unknown
          is_admin?: unknown
        }>(response)
        if (isCancelled) {
          return
        }
        if (!response.ok || !payload) {
          setServerAuth({
            token,
            username: getUsernameFromUser(user),
            isAdmin: isSupabaseAdminUser(user),
          })
          return
        }
        setServerAuth({
          token,
          username:
            typeof payload.username === "string" && payload.username.trim()
              ? payload.username.trim()
              : getUsernameFromUser(user),
          isAdmin: payload.is_admin === true,
        })
      } catch {
        if (isCancelled) {
          return
        }
        setServerAuth({
          token,
          username: getUsernameFromUser(user),
          isAdmin: isSupabaseAdminUser(user),
        })
      }
    }

    void loadServerAuth()

    return () => {
      isCancelled = true
    }
  }, [accessToken, user])

  const value = useMemo<AuthContextValue>(() => {
    return {
      configured,
      loading: loading || !serverAuthLoaded,
      session,
      user,
      username: serverAuth?.username ?? getUsernameFromUser(user),
      isAdmin: serverAuth?.isAdmin ?? isSupabaseAdminUser(user),
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
  }, [configured, loading, serverAuth, serverAuthLoaded, session, supabase, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
