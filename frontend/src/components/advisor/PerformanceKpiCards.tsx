import { AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react"
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
import type { PerformanceSummary } from "@/types/api"

interface PerformanceKpiCardsProps {
  performance: PerformanceSummary
}

export function PerformanceKpiCards({ performance }: PerformanceKpiCardsProps) {
  const comparableCoverage = performance.one_year.comparable_pct ?? 0
  const totalUnderperforming = performance.one_year.underperforming_pct
  const performing = Math.max(0, comparableCoverage - totalUnderperforming)
  const upto3Pct = performance.one_year.upto_3_pct
  const moreThan3Pct = performance.one_year.more_than_3_pct

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <CardDescription>Performing</CardDescription>
            </div>
            <SectionInfoTooltip
              title="Performing Funds"
              formula={
                <>
                  Performing % = Comparable Coverage % - Total Underperforming %<br />
                  Holdings without comparable benchmark data are excluded
                </>
              }
              content={
                <>
                  Percentage of total portfolio (by value) where holdings had comparable benchmark data and met or exceeded their benchmark over 1 year.
                </>
              }
            />
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums text-emerald-600">
            {formatPercent(performing)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex flex-col items-start gap-1 text-sm text-muted-foreground">
          <span>Meeting/exceeding within comparable set</span>
          <span className="text-xs">Comparable coverage: {formatPercent(comparableCoverage)}</span>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardDescription>Underperforming</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {totalUnderperforming > 0 && (
                <Badge
                  variant="outline"
                  className={
                    totalUnderperforming > 20
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  }
                >
                  {totalUnderperforming > 20 ? "High" : "Moderate"}
                </Badge>
              )}
              <SectionInfoTooltip
                title="Total Underperforming"
                formula={
                  <>
                    Underperformance % = (Scheme Return - Benchmark Return) when negative<br />
                    Portfolio Underperformance % = Sum(Underperforming Holdings Value) / Total Portfolio Value * 100
                  </>
                }
                content={
                  <>
                    Percentage of portfolio (by value) where funds underperformed their benchmark over 1 year.
                  </>
                }
              />
            </div>
          </div>
          <CardTitle
            className={`text-2xl font-semibold tabular-nums ${
              totalUnderperforming > 20 ? "text-red-600" : "text-amber-600"
            }`}
          >
            {formatPercent(totalUnderperforming)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">Below benchmark returns (1Y)</CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-violet-600" />
              <CardDescription>Upto 3% Gap</CardDescription>
            </div>
            <SectionInfoTooltip
              title="Upto 3% Underperformance"
              formula={
                <>
                  Underperformance % = (Scheme Return - Benchmark Return) when negative<br />
                  Filtered for: -3% &lt;= Underperformance % &lt; 0%
                </>
              }
              content={
                <>
                  Percentage of portfolio where funds underperformed by 3% or less compared to their benchmark.
                </>
              }
            />
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums text-amber-600">
            {formatPercent(upto3Pct)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">Underperformance &lt;= 3%</CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              <CardDescription>&gt;3% Gap</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {moreThan3Pct > 0 && (
                <Badge
                  variant="outline"
                  className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                >
                  Critical
                </Badge>
              )}
              <SectionInfoTooltip
                title="More than 3% Underperformance"
                formula={
                  <>
                    Underperformance % = (Scheme Return - Benchmark Return) when negative<br />
                    Filtered for: Underperformance % &lt; -3%
                  </>
                }
                content={
                  <>
                    Percentage of portfolio where funds underperformed by more than 3% compared to their benchmark.
                  </>
                }
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums text-red-600">
            {formatPercent(moreThan3Pct)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">Underperformance &gt; 3%</CardFooter>
      </Card>
    </div>
  )
}
