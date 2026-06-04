import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { apiFetch, readJson } from "@/api/client"
import { getBillingAccess } from "@/api/billing"
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
  userId: string
  username: string
  isAdmin: boolean
}

function isSameAuthSession(previous: Session | null, next: Session | null) {
  return (
    previous?.access_token === next?.access_token &&
    previous?.user?.id === next?.user?.id
  )
}

function shouldKeepCurrentSession(
  event: string,
  previous: Session | null,
  next: Session | null,
) {
  return (
    (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
    isSameAuthSession(previous, next)
  )
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
  const [billingAccess, setBillingAccess] = useState<AuthContextValue["billingAccess"]>(null)
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession((currentSession) =>
        shouldKeepCurrentSession(event, currentSession, nextSession)
          ? currentSession
          : nextSession
      )
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const user = session?.user ?? null
  const accessToken = session?.access_token ?? null
  const localUsername = getUsernameFromUser(user)
  const localIsAdmin = isSupabaseAdminUser(user)
  const serverAuthForUser =
    user?.id && serverAuth?.userId === user.id ? serverAuth : null
  const serverAuthLoaded = !accessToken || Boolean(serverAuthForUser)

  const refreshBillingAccess = useCallback(async () => {
    if (!accessToken || !user?.id) {
      setBillingAccess(null)
      return null
    }
    try {
      const access = await getBillingAccess()
      setBillingAccess(access)
      return access
    } catch {
      setBillingAccess(null)
      return null
    }
  }, [accessToken, user?.id])

  useEffect(() => {
    if (!accessToken || !user?.id) {
      setServerAuth(null)
      setBillingAccess(null)
      return
    }

    let isCancelled = false
    const token = accessToken
    const userId = user.id
    setServerAuth((currentAuth) =>
      currentAuth?.userId === userId ? currentAuth : null
    )

    async function loadServerAuth() {
      try {
        const response = await apiFetch("/api/auth/me", { method: "GET" })
        const payload = await readJson<{
          user_id?: unknown
          username?: unknown
          is_admin?: unknown
        }>(response)
        if (isCancelled) {
          return
        }
        if (!response.ok || !payload) {
          setServerAuth({
            token,
            userId,
            username: localUsername,
            isAdmin: localIsAdmin,
          })
          return
        }
        setServerAuth({
          token,
          userId: typeof payload.user_id === "string" ? payload.user_id : userId,
          username:
            typeof payload.username === "string" && payload.username.trim()
              ? payload.username.trim()
              : localUsername,
          isAdmin: payload.is_admin === true,
        })
      } catch {
        if (isCancelled) {
          return
        }
        setServerAuth({
          token,
          userId,
          username: localUsername,
          isAdmin: localIsAdmin,
        })
      }
    }

    void loadServerAuth()

    return () => {
      isCancelled = true
    }
  }, [accessToken, localIsAdmin, localUsername, user?.id])

  useEffect(() => {
    void refreshBillingAccess()
  }, [refreshBillingAccess])

  const value = useMemo<AuthContextValue>(() => {
    return {
      configured,
      loading: loading || !serverAuthLoaded,
      session,
      user,
      username: serverAuthForUser?.username ?? localUsername,
      isAdmin: serverAuthForUser?.isAdmin ?? localIsAdmin,
      billingAccess,
      refreshBillingAccess,
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
  }, [
    configured,
    loading,
    localIsAdmin,
    localUsername,
    billingAccess,
    refreshBillingAccess,
    serverAuthForUser,
    serverAuthLoaded,
    session,
    supabase,
    user,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
