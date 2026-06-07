import { memo, type ReactNode } from "react"
import { CompactCard } from "./cards/CompactCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, BarChart3, Target, TrendingDown, CheckCircle2, AlertTriangle } from "lucide-react"
import { DASHBOARD_ACCENT_STYLES } from "@/lib/dashboardTheme"
import type { DashboardAccent } from "@/lib/dashboardTheme"
import { cn } from "@/lib/utils"
import { toLakhs, formatPercent } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

interface TopCardsProps {
  summary: AnalysisSummary
}

function MetricIcon({
  accent,
  children,
}: {
  accent: DashboardAccent
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center transition-transform duration-300 group-hover:scale-105",
        DASHBOARD_ACCENT_STYLES[accent].icon
      )}
    >
      {children}
    </div>
  )
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
      <CompactCard accent="emerald">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MetricIcon accent="emerald">
              <BarChart3 className="h-4 w-4" />
            </MetricIcon>
            <p className="text-label text-slate-500">
              Current Value
            </p>
          </div>
          <SectionInfoTooltip
            title="Current Value"
            formula={
              <>
                Current Value = Sum(units x latest NAV)<br />
                Absolute Return % = (Current Value - Total Invested) / Total Invested x 100
              </>
            }
            content={
              <>
                Current value is the sum of market value of all holdings. Absolute return shows the overall gain or loss percentage.
              </>
            }
          />
        </div>
        <p className="mb-1 font-mono text-stat-number text-slate-900">
          {toLakhs(summary.total_market_value)}
        </p>
        {returnValue !== 0 && (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold ${
                returnValue >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {returnValue >= 0 ? "Up" : "Down"} {Math.abs(returnValue).toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">Portfolio Return</span>
          </div>
        )}
        {isHighCost && (
          <div className="mt-2">
            <Badge
              variant="outline"
              className="flex items-center gap-1 border-amber-300 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-800"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              High Cost: {formatPercent(costPct)}
            </Badge>
          </div>
        )}
      </CompactCard>

      <CompactCard accent="sky">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MetricIcon accent="sky">
              <Wallet className="h-4 w-4" />
            </MetricIcon>
            <p className="text-label text-slate-500">Total Invested</p>
          </div>
          <SectionInfoTooltip
            title="Total Invested"
            formula={
              <>
                Total Invested = Sum(units x purchase NAV)
              </>
            }
            content={
              <>
                Sum of the cost value of all holdings (what you paid). Calculated as units x purchase NAV (or average cost) for each scheme, summed across the portfolio.
              </>
            }
          />
        </div>
        <p className="font-mono text-stat-number text-slate-900">
          {toLakhs(summary.total_cost_value)}
        </p>
      </CompactCard>

      <CompactCard accent="violet">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MetricIcon accent="violet">
              <TrendingUp className="h-4 w-4" />
            </MetricIcon>
            <p className="text-label text-slate-500">Portfolio Return</p>
          </div>
          <SectionInfoTooltip
            title="Portfolio Return"
            formula={
              <>
                Portfolio Return % = (Current Value - Total Invested) / Total Invested x 100
              </>
            }
            content={
              <>
                Absolute return percentage showing the overall gain or loss on your portfolio.
              </>
            }
          />
        </div>
        <p
          className={cn(
            "mb-1 font-mono text-stat-number",
            returnValue >= 0 ? "text-emerald-600" : "text-rose-600"
          )}
        >
          {formatPercent(returnValue)}
        </p>
        <p className="text-xs text-muted-foreground">Absolute Return</p>
      </CompactCard>

      <CompactCard accent="amber">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MetricIcon accent="amber">
              <Target className="h-4 w-4" />
            </MetricIcon>
            <p className="text-label text-slate-500">XIRR</p>
          </div>
          <div className="flex items-center gap-2">
            {hasPortfolioXirr && hasBenchmarkXirr && (
              <Badge
                variant={isBeatingBenchmark ? "secondary" : "outline"}
                className={`flex items-center gap-1 px-1.5 py-0 text-[10px] ${
                  isBeatingBenchmark
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isBeatingBenchmark ? (
                  <CheckCircle2 className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                {isBeatingBenchmark ? "Beating" : "Under"}
              </Badge>
            )}
            <SectionInfoTooltip
              title="XIRR"
              formula={
                <>
                  XIRR = Internal Rate of Return using cash flows<br />
                  Sum(CF_t / (1 + XIRR)^t) = 0<br />
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
        <p className="mb-1 font-mono text-stat-number text-slate-900">
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
