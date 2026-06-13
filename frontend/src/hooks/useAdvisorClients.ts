import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/auth/useAuth"
import {
  hydrateAdvisorBookFromServer,
  listClients,
} from "@/lib/opportunities/advisorBookStore"
import type { AdvisorBookClient } from "@/lib/opportunities/types"

export function useAdvisorClients() {
  const { user } = useAuth()
  const userId = user?.id
  const [clients, setClients] = useState<AdvisorBookClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshClients = useCallback(async () => {
    if (!userId) {
      setClients([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    try {
      await hydrateAdvisorBookFromServer(true)
      setClients(listClients())
      setError(null)
    } catch (loadError) {
      setClients([])
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load advisor clients."
      )
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refreshClients()
  }, [refreshClients])

  return { clients, loading, error, refreshClients }
}
