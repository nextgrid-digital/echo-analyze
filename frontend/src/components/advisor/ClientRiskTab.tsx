import { AssetAllocationCard } from "./AssetAllocationCard"
import { ConcentrationDetailCard } from "./ConcentrationDetailCard"
import { ConcentrationSummaryCard } from "./ConcentrationSummaryCard"
import { FundOverlapCard } from "./FundOverlapCard"
import { RiskKpiCards } from "./RiskKpiCards"
import type { AnalysisSummary, Holding } from "@/types/api"

interface ClientRiskTabProps {
  summary: AnalysisSummary
  holdings: Holding[]
}

export function ClientRiskTab({ summary, holdings }: ClientRiskTabProps) {
  return (
    <div className="space-y-6">
      <RiskKpiCards summary={summary} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <AssetAllocationCard summary={summary} holdings={holdings} />
        </div>
        <ConcentrationSummaryCard summary={summary} />
      </div>

      {summary.concentration && (
        <ConcentrationDetailCard concentration={summary.concentration} />
      )}

      {summary.overlap && <FundOverlapCard overlap={summary.overlap} />}
    </div>
  )
}
