import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AdvisorShellPage } from "@/components/advisor/AdvisorShellPage"
import { FundDetailView } from "@/features/fund-detail/components/FundDetailView"
import { Button } from "@/components/ui/button"
import { useClientAnalysis } from "@/hooks/useClientAnalysis"
import { buildHoldingsTabPath, findHoldingByKey } from "@/lib/holdings/holdingKey"

export function FundDetailPage() {
  const { holdingKey = "" } = useParams<{ holdingKey: string }>()
  const { hydrated, summary, holdings, hasData, clientPan } = useClientAnalysis()
  const [renderNowMs] = useState(() => Date.now())

  const holding = useMemo(
    () => (holdingKey ? findHoldingByKey(holdings, holdingKey) : undefined),
    [holdings, holdingKey]
  )

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading fund details...
      </div>
    )
  }

  if (!hasData || !holding) {
    return (
      <AdvisorShellPage>
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">Fund not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This holding is not in the active client portfolio. Return to holdings to pick another
            fund.
          </p>
          <Button asChild className="mt-6">
            <Link to={clientPan ? buildHoldingsTabPath(clientPan) : "/clients"}>
              View holdings
            </Link>
          </Button>
        </div>
      </AdvisorShellPage>
    )
  }

  return (
    <AdvisorShellPage>
      <FundDetailView
        holding={holding}
        totalMarketValue={summary.total_market_value}
        clientPan={clientPan ?? holding.folio}
        renderNowMs={renderNowMs}
      />
    </AdvisorShellPage>
  )
}
