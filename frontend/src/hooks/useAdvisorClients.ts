import { useCallback, useEffect, useState } from "react"
import { listClients } from "@/lib/opportunities/advisorBookStore"
import type { AdvisorBookClient } from "@/lib/opportunities/types"

export function useAdvisorClients() {
  const [clients, setClients] = useState<AdvisorBookClient[]>([])

  const refreshClients = useCallback(() => {
    setClients(listClients())
  }, [])

  useEffect(() => {
    refreshClients()
  }, [refreshClients])

  return { clients, refreshClients }
}
