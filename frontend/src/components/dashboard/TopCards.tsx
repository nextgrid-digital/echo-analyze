import { memo } from "react"
import { CompactCard } from "./cards/CompactCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, BarChart3, Target, TrendingDown, CheckCircle2, AlertTriangle } from "lucide-react"
import { toLakhs, formatPercent } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

interface TopCardsProps {
  summary: AnalysisSummary
}

function TopCardsInner({ summary }: TopCardsProps) {
  const returnValue = summary.portfolio_return ?? 0
  const xirrValue = summary.portfolio_xirr
  const benchmarkXirr = summary.benchmark_xirr
  const hasPortfolioXirr = xirrValue !== null && xirrValue !== undefined
  const hasBenchmarkXirr = benchmarkXirr !== null && benchmarkXirr !== undefined
  const isBeatingBenchmark =
    hasPortfolioXirr && hasBenchmarkXirr ? (xirrValue as number) >= (benchmarkXirr as number) : false
  const costPct = summary.cost?.portfolio_cost_pct ?? 0
  const isHighCost = costPct > 1.5

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Current Value card */}
      <CompactCard>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Current Value
            </p>
          </div>
          <SectionInfoTooltip
            title="Current Value"
            formula={
              <>
                Current Value = Σ(units × latest NAV)<br />
                Absolute Return % = (Current Value − Total Invested) ÷ Total Invested × 100
              </>
            }
            content={
              <>
                Current value is the sum of market value of all holdings. Absolute return shows the overall gain or loss percentage.
              </>
            }
          />
        </div>
        <p className="text-lg font-bold text-foreground font-mono mb-1">
          {toLakhs(summary.total_market_value)}
        </p>
        {returnValue !== 0 && (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold ${
                returnValue >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {returnValue >= 0 ? "↑" : "↓"} {Math.abs(returnValue).toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">Portfolio Return</span>
          </div>
        )}
        {isHighCost && (
          <div className="mt-2">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 flex items-center gap-1"
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              High Cost: {formatPercent(costPct)}
            </Badge>
          </div>
        )}
      </CompactCard>

      {/* Total Invested card */}
      <CompactCard>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Invested
            </p>
          </div>
          <SectionInfoTooltip
            title="Total Invested"
            formula={
              <>
                Total Invested = Σ(units × purchase NAV)
              </>
            }
            content={
              <>
                Sum of the cost value of all holdings (what you paid). Calculated as units × purchase NAV (or average cost) for each scheme, summed across the portfolio.
              </>
            }
          />
        </div>
        <p className="text-lg font-bold text-foreground font-mono">
          {toLakhs(summary.total_cost_value)}
        </p>
      </CompactCard>

      {/* Portfolio Return card */}
      <CompactCard>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Portfolio Return
            </p>
          </div>
          <SectionInfoTooltip
            title="Portfolio Return"
            formula={
              <>
                Portfolio Return % = (Current Value − Total Invested) ÷ Total Invested × 100
              </>
            }
            content={
              <>
                Absolute return percentage showing the overall gain or loss on your portfolio.
              </>
            }
          />
        </div>
        <p className="text-lg font-bold text-foreground font-mono mb-1">
          {formatPercent(returnValue)}
        </p>
        <p className="text-xs text-muted-foreground">Absolute Return</p>
      </CompactCard>

      {/* XIRR card */}
      <CompactCard>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              XIRR
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasPortfolioXirr && hasBenchmarkXirr && (
              <Badge
                variant={isBeatingBenchmark ? "secondary" : "outline"}
                className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${
                  isBeatingBenchmark
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                }`}
              >
                {isBeatingBenchmark ? (
                  <CheckCircle2 className="w-2.5 h-2.5" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5" />
                )}
                {isBeatingBenchmark ? "Beating" : "Under"}
              </Badge>
            )}
            <SectionInfoTooltip
              title="XIRR"
              formula={
                <>
                  XIRR = Internal Rate of Return using cash flows<br />
                  Σ(CFₜ / (1 + XIRR)^t) = 0<br />
                  Guardrail: no hard % cap; if no stable root exists, show N/A
                </>
              }
              content={
                <>
                  XIRR (Extended Internal Rate of Return) accounts for the timing of your investments and redemptions. It&apos;s compared against the benchmark XIRR for the same period. If cash flows are not valid for a stable solve (for example no sign change or non-convergent cases), XIRR is shown as N/A instead of forcing/capping a number.
                </>
              }
            />
          </div>
        </div>
        <p className="text-lg font-bold text-foreground font-mono mb-1">
          {hasPortfolioXirr ? formatPercent(xirrValue as number) : "N/A"}
        </p>
        <p className="text-xs text-muted-foreground">
          {hasBenchmarkXirr
            ? `Benchmark: ${formatPercent(benchmarkXirr as number)}`
            : "Internal Rate of Return"}
        </p>
      </CompactCard>
    </div>
  )
}

export const TopCards = memo(TopCardsInner)
