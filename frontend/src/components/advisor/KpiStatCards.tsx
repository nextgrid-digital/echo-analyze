import { TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { computeRiskScore } from "@/lib/riskScore"
import { formatPercent } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

function formatAum(value: number) {
  if (value >= 100_000) {
    return `₹${(value / 100_000).toFixed(2)} Cr`
  }
  return `₹${value.toLocaleString("en-IN")}`
}

interface KpiStatCardsProps {
  summary: AnalysisSummary
}

export function KpiStatCards({ summary }: KpiStatCardsProps) {
  const returnValue = summary.portfolio_return ?? 0
  const xirr = summary.portfolio_xirr
  const benchmarkXirr = summary.benchmark_xirr
  const underperforming = summary.performance_summary?.one_year.underperforming_pct ?? 0
  const { riskScore, label: riskLabel } = computeRiskScore(summary)
  const xirrDiff =
    xirr != null && benchmarkXirr != null ? xirr - benchmarkXirr : null
  const isPositiveReturn = returnValue >= 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Current Value</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {formatAum(summary.total_market_value)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex flex-col items-start gap-1 text-sm">
          {returnValue !== 0 && (
            <div className="flex items-center gap-1">
              {isPositiveReturn ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-600" />
              )}
              <span className={isPositiveReturn ? "text-emerald-600" : "text-rose-600"}>
                {formatPercent(returnValue)} absolute return
              </span>
            </div>
          )}
          {xirr != null && (
            <span className="text-muted-foreground">XIRR {formatPercent(xirr)}</span>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Invested</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {formatAum(summary.total_cost_value)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          {summary.holdings_count ?? summary.concentration?.fund_count ?? "—"} holdings
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>vs Benchmark (XIRR)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {xirrDiff != null ? (
              <span className={xirrDiff >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {xirrDiff >= 0 ? "+" : ""}
                {formatPercent(xirrDiff)}
              </span>
            ) : (
              "—"
            )}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          {benchmarkXirr != null ? `Benchmark: ${formatPercent(benchmarkXirr)}` : "No benchmark data"}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Underperforming</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-rose-600">
            {formatPercent(underperforming)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          of portfolio value (1Y)
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Risk Score</CardDescription>
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {riskScore}/100
            </CardTitle>
            <Badge
              variant={riskScore >= 60 ? "destructive" : riskScore >= 30 ? "secondary" : "outline"}
            >
              {riskLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="w-full pt-0">
          <Progress value={riskScore} className="h-2 w-full" />
        </CardFooter>
      </Card>
    </div>
  )
}
