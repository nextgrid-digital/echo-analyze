import { memo, type ReactNode } from "react"
import { CompactCard } from "./cards/CompactCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  TrendingUp,
  BarChart3,
  Target,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react"
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
  hero = false,
}: {
  accent: DashboardAccent
  children: ReactNode
  hero?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
        hero
          ? "h-12 w-12 rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-sm"
          : cn("h-10 w-10", DASHBOARD_ACCENT_STYLES[accent].icon)
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
    hasPortfolioXirr && hasBenchmarkXirr
      ? (xirrValue as number) >= (benchmarkXirr as number)
      : false
  const costPct = summary.cost?.portfolio_cost_pct ?? 0
  const isHighCost = costPct > 1.5
  const gainAmount = summary.total_market_value - summary.total_cost_value

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:grid-rows-2 lg:gap-6">
      <CompactCard
        accent="emerald"
        variant="hero"
        className="sm:col-span-2 lg:col-span-2 lg:row-span-2"
      >
        <div className="flex h-full min-h-[200px] flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <MetricIcon accent="emerald" hero>
                <BarChart3 className="h-5 w-5" />
              </MetricIcon>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-200/90">
                  Portfolio value
                </p>
                <p className="text-sm font-medium text-white/70">Current market value</p>
              </div>
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

          <div className="mt-6">
            <p className="text-hero-stat font-mono font-bold tracking-tight text-white">
              {toLakhs(summary.total_market_value)}
            </p>
            {returnValue !== 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-emerald-400/20 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                  <Sparkles className="mr-1 h-3 w-3" />
                  {returnValue >= 0 ? "+" : ""}
                  {formatPercent(returnValue)} return
                </Badge>
                {gainAmount > 0 && (
                  <span className="text-xs text-teal-100/80">
                    +{toLakhs(gainAmount)} vs cost
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Invested</p>
              <p className="font-mono text-sm font-semibold text-white">
                {toLakhs(summary.total_cost_value)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Holdings</p>
              <p className="font-mono text-sm font-semibold text-white">
                {summary.holdings_count ?? summary.concentration?.fund_count ?? "—"}
              </p>
            </div>
          </div>

          {isHighCost && (
            <div className="mt-3">
              <Badge
                variant="outline"
                className="border-amber-300/40 bg-amber-400/10 text-[10px] text-amber-100"
              >
                <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                High cost: {formatPercent(costPct)}
              </Badge>
            </div>
          )}
        </div>
      </CompactCard>

      <CompactCard accent="sky" className="lg:col-start-3 lg:row-start-1">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MetricIcon accent="sky">
              <Wallet className="h-4 w-4" />
            </MetricIcon>
            <p className="text-label text-slate-500 dark:text-slate-400">Total Invested</p>
          </div>
          <SectionInfoTooltip
            title="Total Invested"
            formula={<>Total Invested = Sum(units x purchase NAV)</>}
            content={
              <>
                Sum of the cost value of all holdings (what you paid). Calculated as units x purchase NAV (or average cost) for each scheme, summed across the portfolio.
              </>
            }
          />
        </div>
        <p className="font-mono text-stat-number text-slate-900 dark:text-slate-50">
          {toLakhs(summary.total_cost_value)}
        </p>
      </CompactCard>

      <CompactCard accent="violet" className="lg:col-start-4 lg:row-start-1">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MetricIcon accent="violet">
              <TrendingUp className="h-4 w-4" />
            </MetricIcon>
            <p className="text-label text-slate-500 dark:text-slate-400">Portfolio Return</p>
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
        <p className="text-xs text-muted-foreground">Absolute return</p>
      </CompactCard>

      <CompactCard accent="amber" className="sm:col-span-2 lg:col-span-2 lg:col-start-3 lg:row-start-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <MetricIcon accent="amber">
                  <Target className="h-4 w-4" />
                </MetricIcon>
                <p className="text-label text-slate-500 dark:text-slate-400">XIRR performance</p>
              </div>
              <div className="flex items-center gap-2">
                {hasPortfolioXirr && hasBenchmarkXirr && (
                  <Badge
                    className={cn(
                      "flex items-center gap-1 border-0 px-2 py-0.5 text-[10px] font-semibold",
                      isBeatingBenchmark
                        ? "bg-emerald-500 text-white"
                        : "bg-amber-500 text-white"
                    )}
                  >
                    {isBeatingBenchmark ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isBeatingBenchmark ? "Beating benchmark" : "Below benchmark"}
                  </Badge>
                )}
                <SectionInfoTooltip
                  title="XIRR"
                  formula={
                    <>
                      XIRR = Internal Rate of Return using cash flows<br />
                      Sum(CF_t / (1 + XIRR)^t) = 0
                    </>
                  }
                  content={
                    <>
                      XIRR accounts for the timing of investments and redemptions, compared against benchmark XIRR for the same period.
                    </>
                  }
                />
              </div>
            </div>
            <p className="font-mono text-stat-number text-slate-900 dark:text-slate-50">
              {hasPortfolioXirr ? formatPercent(xirrValue as number) : "N/A"}
            </p>
          </div>
          {hasBenchmarkXirr && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 sm:min-w-[140px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/70">
                Benchmark
              </p>
              <p className="font-mono text-lg font-bold text-amber-900">
                {formatPercent(benchmarkXirr as number)}
              </p>
            </div>
          )}
        </div>
      </CompactCard>
    </div>
  )
}

export const TopCards = memo(TopCardsInner)
