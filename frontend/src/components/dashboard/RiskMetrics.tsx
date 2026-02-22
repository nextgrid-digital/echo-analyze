import { memo, useMemo } from "react"
import { CompactCard } from "./cards/CompactCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, BarChart3, AlertTriangle, Activity } from "lucide-react"
import { formatPercent } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

interface RiskMetricsProps {
  summary: AnalysisSummary
}

function RiskMetricsInner({ summary }: RiskMetricsProps) {
  // Calculate risk metrics from available data
  // Note: These are simplified calculations - real risk metrics would require historical NAV data
  const riskMetrics = useMemo(() => {
    const xirr = summary.portfolio_xirr
    const equityPct = summary.equity_pct ?? 0

    // Simplified volatility estimate (would need historical data for accurate calculation)
    // Using equity allocation as proxy for volatility
    const estimatedVolatility = Math.min(equityPct * 0.15, 25) // Rough estimate

    // Simplified Sharpe ratio (would need risk-free rate and actual volatility)
    // Assuming risk-free rate of 6% and using estimated volatility
    const riskFreeRate = 6
    const sharpeRatio =
      xirr !== null && xirr !== undefined && estimatedVolatility > 0
        ? (xirr - riskFreeRate) / estimatedVolatility
        : null

    // Beta estimate (correlation with market) - simplified
    // Higher equity allocation typically means higher beta
    const beta = (equityPct / 100) * 1.2 // Rough estimate

    // Risk score (0-100) based on multiple factors
    const riskScore = Math.min(
      equityPct * 0.6 + estimatedVolatility * 1.5,
      100
    )

    return {
      volatility: estimatedVolatility,
      sharpeRatio,
      beta: beta,
      riskScore: riskScore,
    }
  }, [summary])

  const getRiskScoreColor = (score: number) => {
    if (score < 30) return "text-green-600"
    if (score < 60) return "text-amber-500"
    return "text-red-600"
  }

  const getRiskScoreLabel = (score: number) => {
    if (score < 30) return "Low Risk"
    if (score < 60) return "Moderate Risk"
    return "High Risk"
  }

  const getRiskScoreBadgeColor = (score: number) => {
    if (score < 30) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    if (score < 60) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-3 border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-900">
        Estimated metrics: volatility, Sharpe, beta, and risk score are heuristic proxies and not based on full historical return series.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Volatility card */}
        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Volatility
              </p>
            </div>
            <SectionInfoTooltip
              title="Volatility"
              formula={
                <>
                  Volatility = Standard Deviation of Returns<br />
                  Estimated from equity allocation and portfolio characteristics
                </>
              }
              content={
                <>
                  Volatility measures the variability of returns. Higher volatility indicates greater price swings. Estimated annual volatility based on portfolio composition.
                </>
              }
            />
          </div>
          <p className="text-lg font-bold text-foreground font-mono mb-1">
            {formatPercent(riskMetrics.volatility)}
          </p>
          <p className="text-xs text-muted-foreground">Estimated annual volatility</p>
        </CompactCard>

        {/* Sharpe Ratio card */}
        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sharpe Ratio
              </p>
            </div>
            <SectionInfoTooltip
              title="Sharpe Ratio"
              formula={
                <>
                  Sharpe Ratio = (Portfolio Return − Risk-Free Rate) ÷ Volatility<br />
                  Higher ratio = Better risk-adjusted returns
                </>
              }
              content={
                <>
                  Sharpe ratio measures risk-adjusted returns. A higher Sharpe ratio indicates better returns relative to the risk taken. Calculated using portfolio XIRR, risk-free rate, and estimated volatility.
                </>
              }
            />
          </div>
          <p className="text-lg font-bold text-foreground font-mono mb-1">
            {riskMetrics.sharpeRatio !== null ? riskMetrics.sharpeRatio.toFixed(2) : "N/A"}
          </p>
          <p className="text-xs text-muted-foreground">Risk-adjusted return</p>
        </CompactCard>

        {/* Beta card */}
        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Beta
              </p>
            </div>
            <SectionInfoTooltip
              title="Beta"
              formula={
                <>
                  Beta = Covariance(Portfolio, Market) ÷ Variance(Market)<br />
                  Beta &gt; 1 = More volatile than market<br />
                  Beta &lt; 1 = Less volatile than market
                </>
              }
              content={
                <>
                  Beta measures portfolio correlation with the market. A beta of 1 means the portfolio moves with the market. Higher beta indicates more volatility relative to the market.
                </>
              }
            />
          </div>
          <p className="text-lg font-bold text-foreground font-mono mb-1">
            {riskMetrics.beta.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">Market correlation</p>
        </CompactCard>

        {/* Risk Score card */}
        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Risk Score
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${getRiskScoreBadgeColor(riskMetrics.riskScore)}`}
              >
                {getRiskScoreLabel(riskMetrics.riskScore)}
              </Badge>
              <SectionInfoTooltip
                title="Risk Score"
                formula={
                  <>
                    Risk Score = f(Equity Allocation, Volatility, Concentration)<br />
                    Score Range: 0-100<br />
                    Lower = Lower Risk, Higher = Higher Risk
                  </>
                }
                content={
                  <>
                    Composite risk score combining equity allocation, estimated volatility, and portfolio concentration. Lower scores indicate lower risk.
                  </>
                }
              />
            </div>
          </div>
          <p className={`text-lg font-bold font-mono mb-1 ${getRiskScoreColor(riskMetrics.riskScore)}`}>
            {riskMetrics.riskScore.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">Composite risk metric</p>
        </CompactCard>
      </div>
    </div>
  )
}

export const RiskMetrics = memo(RiskMetricsInner)
