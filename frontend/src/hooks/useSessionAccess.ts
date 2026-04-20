import { useAuth } from "@clerk/react"
import { useEffect, useState } from "react"
import { getCurrentSession } from "@/api/auth"
import type { AuthSessionResponse } from "@/types/auth"

export function useSessionAccess() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [session, setSession] = useState<AuthSessionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadSession() {
      if (!isLoaded) {
        return
      }

      if (!isSignedIn) {
        setSession(null)
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const nextSession = await getCurrentSession(getToken)
        if (!isCancelled) {
          setSession(nextSession)
          setError(null)
        }
      } catch (nextError) {
        if (!isCancelled) {
          setSession(null)
          setError(nextError instanceof Error ? nextError.message : "Unable to load session.")
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void loadSession()

    return () => {
      isCancelled = true
    }
  }, [getToken, isLoaded, isSignedIn])

  return {
    session,
    loading: !isLoaded || loading,
    error,
  }
}
