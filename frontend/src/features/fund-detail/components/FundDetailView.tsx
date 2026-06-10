import { buildIllustrativeNews } from "@/lib/holdings/fundDetailMetrics"
import type { Holding } from "@/types/api"
import { FundClassificationCard } from "./FundClassificationCard"
import { FundDetailHeader } from "./FundDetailHeader"
import { FundMetricsGrid } from "./FundMetricsGrid"
import { FundNewsPanel } from "./FundNewsPanel"
import { FundPerformancePanel } from "./FundPerformancePanel"

interface FundDetailViewProps {
  holding: Holding
  totalMarketValue: number
  clientPan: string
  renderNowMs: number
}

export function FundDetailView({
  holding,
  totalMarketValue,
  renderNowMs,
}: FundDetailViewProps) {
  const newsItems = buildIllustrativeNews(holding)

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <FundDetailHeader holding={holding} />
      <FundMetricsGrid
        holding={holding}
        totalMarketValue={totalMarketValue}
        renderNowMs={renderNowMs}
      />
      <FundPerformancePanel holding={holding} />
      <div className="grid gap-6 lg:grid-cols-2">
        <FundClassificationCard holding={holding} />
        <FundNewsPanel items={newsItems} />
      </div>
    </div>
  )
}
