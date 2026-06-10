import { getNormalizedEquityAllocationPct } from "@/lib/portfolioAnalysis"
import type { AnalysisSummary } from "@/types/api"

export interface RiskScoreResult {
  riskScore: number
  label: "Low Risk" | "Moderate Risk" | "High Risk"
}

export function computeRiskScore(summary: AnalysisSummary): RiskScoreResult {
  const equityPct = getNormalizedEquityAllocationPct(summary)
  const estimatedVolatility = Math.min(equityPct * 0.15, 25)
  const fundCount = summary.concentration?.fund_count ?? 0
  const concentrationRisk = fundCount > 0 && fundCount < 5 ? 15 : fundCount > 20 ? 10 : 0
  const riskScore = Math.min(
    equityPct * 0.55 + estimatedVolatility * 1.3 + concentrationRisk,
    100
  )

  let label: RiskScoreResult["label"] = "Low Risk"
  if (riskScore >= 60) label = "High Risk"
  else if (riskScore >= 30) label = "Moderate Risk"

  return { riskScore: Math.round(riskScore), label }
}
