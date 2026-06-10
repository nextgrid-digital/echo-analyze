import { useMemo } from "react"
import { useLocation, useParams, useSearchParams } from "react-router-dom"
import { useClientAnalysis } from "@/hooks/useClientAnalysis"
import { buildBreadcrumbs } from "@/lib/breadcrumbs/buildBreadcrumbs"
import { findHoldingByKey } from "@/lib/holdings/holdingKey"
import { getClientByPan } from "@/lib/opportunities/advisorBookStore"

export function useBreadcrumbs() {
  const { pathname, search } = useLocation()
  const { pan: panFromRoute, holdingKey } = useParams<{ pan?: string; holdingKey?: string }>()
  const [searchParams] = useSearchParams()
  const panParam = searchParams.get("pan") ?? panFromRoute

  const isFundDetail = pathname.includes("/dashboard/holdings/")
  const needsClientContext =
    isFundDetail || (pathname.startsWith("/clients/") && Boolean(panParam))

  const { summary, holdings, clientPan: analysisClientPan } = useClientAnalysis()

  return useMemo(() => {
    let clientName = summary.investor_info?.name?.trim()
    let clientPan = panParam ?? analysisClientPan ?? undefined

    if (panParam && !clientName) {
      const client = getClientByPan(panParam)
      clientName = client?.name
      clientPan = panParam
    }

    if (!clientName && needsClientContext) {
      clientName = "Client"
    }

    let fundName: string | undefined
    if (holdingKey && holdings.length > 0) {
      fundName = findHoldingByKey(holdings, holdingKey)?.scheme_name
    }

    return buildBreadcrumbs({
      pathname,
      search,
      clientName,
      clientPan,
      fundName,
    })
  }, [
    pathname,
    search,
    panParam,
    holdingKey,
    holdings,
    summary.investor_info?.name,
    analysisClientPan,
    needsClientContext,
  ])
}
