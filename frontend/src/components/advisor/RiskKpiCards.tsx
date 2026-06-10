import { useMemo } from "react"
import { Activity, AlertTriangle, BarChart3, TrendingUp } from "lucide-react"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatPercent } from "@/lib/format"
import { getNormalizedEquityAllocationPct } from "@/lib/portfolioAnalysis"
import type { AnalysisSummary } from "@/types/api"

interface RiskKpiCardsProps {
  summary: AnalysisSummary
}

export function RiskKpiCards({ summary }: RiskKpiCardsProps) {
  const riskMetrics = useMemo(() => {
    const xirr = summary.portfolio_xirr
    const equityPct = getNormalizedEquityAllocationPct(summary)
    const estimatedVolatility = Math.min(equityPct * 0.15, 25)
    const riskFreeRate = 6
    const sharpeRatio =
      xirr != null && estimatedVolatility > 0
        ? (xirr - riskFreeRate) / estimatedVolatility
        : null
    const beta = (equityPct / 100) * 1.2
    const fundCount = summary.concentration?.fund_count ?? 0
    const concentrationRisk = fundCount > 0 && fundCount < 5 ? 15 : fundCount > 20 ? 10 : 0
    const riskScore = Math.min(
      equityPct * 0.55 + estimatedVolatility * 1.3 + concentrationRisk,
      100
    )

    return { volatility: estimatedVolatility, sharpeRatio, beta, riskScore }
  }, [summary])

  const getRiskScoreLabel = (score: number) => {
    if (score < 30) return "Low Risk"
    if (score < 60) return "Moderate Risk"
    return "High Risk"
  }

  const getRiskScoreColor = (score: number) => {
    if (score < 30) return "text-emerald-600"
    if (score < 60) return "text-amber-600"
    return "text-red-600"
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardDescription>Volatility</CardDescription>
            </div>
            <SectionInfoTooltip
              title="Volatility"
              formula={<>Volatility = Standard Deviation of Returns</>}
              content={
                <>
                  Estimated annual volatility based on portfolio composition. Higher volatility indicates greater price swings.
                </>
              }
            />
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {formatPercent(riskMetrics.volatility)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          Heuristic estimate from equity allocation
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardDescription>Sharpe Ratio</CardDescription>
            </div>
            <SectionInfoTooltip
              title="Sharpe Ratio"
              formula={
                <>
                  Sharpe Ratio = (Portfolio Return - Risk-Free Rate) / Volatility
                </>
              }
              content={
                <>
                  Risk-adjusted return measure. Higher values indicate better returns relative to risk taken.
                </>
              }
            />
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {riskMetrics.sharpeRatio != null ? riskMetrics.sharpeRatio.toFixed(2) : "—"}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">Risk-adjusted return</CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardDescription>Beta</CardDescription>
            </div>
            <SectionInfoTooltip
              title="Beta"
              formula={<>Beta = Covariance(Portfolio, Market) / Variance(Market)</>}
              content={
                <>
                  Market correlation estimate. Beta above 1 means more volatile than the market.
                </>
              }
            />
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {riskMetrics.beta.toFixed(2)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">Market correlation</CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex shrink-0 items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
              <CardDescription className="whitespace-nowrap">Risk Score</CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="whitespace-nowrap">
                {getRiskScoreLabel(riskMetrics.riskScore)}
              </Badge>
              <SectionInfoTooltip
                title="Risk Score"
                formula={<>Risk Score = f(Equity Allocation, Volatility, Fund Count)</>}
                content={
                  <>
                    Composite risk score from equity allocation, estimated volatility, and fund-count concentration.
                  </>
                }
              />
            </div>
          </div>
          <CardTitle
            className={`text-2xl font-semibold tabular-nums ${getRiskScoreColor(riskMetrics.riskScore)}`}
          >
            {riskMetrics.riskScore.toFixed(0)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">Composite risk metric (0–100)</CardFooter>
      </Card>
    </div>
  )
}
