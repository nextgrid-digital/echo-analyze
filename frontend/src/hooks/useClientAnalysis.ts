import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { loadLatestAnalysis } from "@/lib/analysisSession"
import { getActiveClientPan, setActiveClientPan } from "@/lib/activeClient"
import { getClientByPan, listClients } from "@/lib/opportunities/advisorBookStore"
import { isStaleAnalysis } from "@/lib/analysisVersion"
import { createEmptyHoldings, createEmptySummary } from "@/lib/emptyData"
import type { AnalysisResponse } from "@/types/api"

export function useClientAnalysis() {
  const { pan: panFromRoute } = useParams<{ pan?: string }>()
  const [searchParams] = useSearchParams()
  const panParam = searchParams.get("pan") ?? panFromRoute
  const [hydrated, setHydrated] = useState(false)
  const [storedResult, setStoredResult] = useState<AnalysisResponse | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const refreshAnalysis = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  useEffect(() => {
    const pan = panParam ?? getActiveClientPan()
    if (pan) {
      const client = getClientByPan(pan)
      if (client?.analysis) {
        setStoredResult(client.analysis)
        setActiveClientPan(pan)
        setHydrated(true)
        return
      }
    }

    const latest = loadLatestAnalysis()
    if (latest?.summary) {
      const latestPan = latest.summary.investor_info?.pan?.trim()
      if (latestPan) setActiveClientPan(latestPan)
      setStoredResult(latest)
      setHydrated(true)
      return
    }

    const clients = listClients()
    if (clients.length > 0) {
      const fallback = clients[0]
      setActiveClientPan(fallback.pan)
      setStoredResult(fallback.analysis)
      setHydrated(true)
      return
    }

    setStoredResult(null)
    setHydrated(true)
  }, [panParam, reloadKey])

  const result = storedResult

  const summary = useMemo(
    () => result?.summary ?? createEmptySummary(),
    [result?.summary]
  )
  const holdings = useMemo(
    () => result?.holdings ?? createEmptyHoldings(),
    [result?.holdings]
  )
  const hasData = Boolean(result?.summary)
  const clientPan =
    summary.investor_info?.pan?.trim() ?? panParam ?? getActiveClientPan() ?? undefined

  const staleAnalysis = isStaleAnalysis(result?.summary)

  return {
    hydrated,
    result,
    summary,
    holdings,
    hasData,
    clientPan,
    staleAnalysis,
    refreshAnalysis,
  }
}
