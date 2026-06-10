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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPercent } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

interface TopCardsProps {
  summary: AnalysisSummary
}

function formatLakhsParts(value: number) {
  if (value >= 100_000) {
    return { amount: (value / 100_000).toFixed(2), unit: "Lakhs" }
  }
  return { amount: value.toLocaleString("en-IN"), unit: null }
}

function MetricIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      {children}
    </div>
  )
}

function LakhsValue({
  value,
  size = "default",
  className,
}: {
  value: number
  size?: "default" | "large"
  className?: string
}) {
  const { amount, unit } = formatLakhsParts(value)

  return (
    <p
      className={cn(
        "font-mono font-semibold tracking-tight text-foreground",
        size === "large" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
        className
      )}
    >
      <span className="whitespace-nowrap">Rs {amount}</span>
      {unit && (
        <span className="ml-1.5 text-sm font-medium text-muted-foreground sm:text-base">
          {unit}
        </span>
      )}
    </p>
  )
}

function MetricCard({
  label,
  tooltip,
  icon,
  children,
  className,
}: {
  label: string
  tooltip: ReactNode
  icon: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <CompactCard className={cn("flex h-full flex-col", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <MetricIcon>{icon}</MetricIcon>
          <p className="text-label text-muted-foreground">{label}</p>
        </div>
        {tooltip}
      </div>
      <div className="mt-auto">{children}</div>
    </CompactCard>
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
  const isPositiveReturn = returnValue >= 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
      <MetricCard
        label="Portfolio value"
        icon={<BarChart3 className="h-4 w-4" />}
        tooltip={
          <SectionInfoTooltip
            title="Current Value"
            formula={
              <>
                Current Value = Sum(units x latest NAV)
                <br />
                Absolute Return % = (Current Value - Total Invested) / Total Invested x 100
              </>
            }
            content={
              <>
                Current value is the sum of market value of all holdings. Absolute return shows
                the overall gain or loss percentage.
              </>
            }
          />
        }
      >
        <LakhsValue value={summary.total_market_value} size="large" />
        {returnValue !== 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold",
                isPositiveReturn ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {isPositiveReturn ? "+" : ""}
              {formatPercent(returnValue)}
            </span>
            {gainAmount > 0 && (
              <span className="text-xs text-muted-foreground">
                +{formatLakhsParts(gainAmount).amount} Lakhs vs cost
              </span>
            )}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/80 pt-3 ">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Invested
            </p>
            <p className="font-mono text-sm font-semibold text-foreground">
              Rs {formatLakhsParts(summary.total_cost_value).amount}{" "}
              <span className="font-medium text-muted-foreground">Lakhs</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Holdings
            </p>
            <p className="font-mono text-sm font-semibold text-foreground">
              {summary.holdings_count ?? summary.concentration?.fund_count ?? "—"}
            </p>
          </div>
        </div>
        {isHighCost && (
          <div className="mt-3">
            <Badge
              variant="outline"
              className="text-[10px]"
            >
              <AlertTriangle className="mr-1 h-2.5 w-2.5" />
              High cost: {formatPercent(costPct)}
            </Badge>
          </div>
        )}
      </MetricCard>

      <MetricCard
        label="Total invested"
        icon={<Wallet className="h-4 w-4" />}
        tooltip={
          <SectionInfoTooltip
            title="Total Invested"
            formula={<>Total Invested = Sum(units x purchase NAV)</>}
            content={
              <>
                Sum of the cost value of all holdings (what you paid). Calculated as units x
                purchase NAV (or average cost) for each scheme, summed across the portfolio.
              </>
            }
          />
        }
      >
        <LakhsValue value={summary.total_cost_value} />
      </MetricCard>

      <MetricCard
        label="Portfolio return"
        icon={<TrendingUp className="h-4 w-4" />}
        tooltip={
          <SectionInfoTooltip
            title="Portfolio Return"
            formula={
              <>Portfolio Return % = (Current Value - Total Invested) / Total Invested x 100</>
            }
            content={
              <>Absolute return percentage showing the overall gain or loss on your portfolio.</>
            }
          />
        }
      >
        <p
          className={cn(
            "font-mono text-2xl font-semibold tracking-tight sm:text-3xl",
            isPositiveReturn ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}
        >
          {formatPercent(returnValue)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Absolute return</p>
      </MetricCard>

      <MetricCard
        label="XIRR"
        icon={<Target className="h-4 w-4" />}
        tooltip={
          <SectionInfoTooltip
            title="XIRR"
            formula={
              <>
                XIRR = Internal Rate of Return using cash flows
                <br />
                Sum(CF_t / (1 + XIRR)^t) = 0
              </>
            }
            content={
              <>
                XIRR accounts for the timing of investments and redemptions, compared against
                benchmark XIRR for the same period.
              </>
            }
          />
        }
      >
        <p className="font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {hasPortfolioXirr ? formatPercent(xirrValue as number) : "N/A"}
        </p>
        {hasPortfolioXirr && hasBenchmarkXirr && (
          <div className="mt-3 space-y-2">
            <Badge
              variant="outline"
              className={cn(
                "border-0 px-2 py-0.5 text-[10px] font-semibold",
                isBeatingBenchmark
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isBeatingBenchmark ? (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {isBeatingBenchmark ? "Beating benchmark" : "Below benchmark"}
            </Badge>
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Benchmark
              </p>
              <p className="font-mono text-lg font-semibold text-foreground">
                {formatPercent(benchmarkXirr as number)}
              </p>
            </div>
          </div>
        )}
      </MetricCard>
    </div>
  )
}

export const TopCards = memo(TopCardsInner)
