import { TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  calculateMissedGains,
  formatSignedRupees,
  getBenchmarkName,
  getDisplayedMissedGains,
  getMissedGainsColorClass,
} from "@/components/dashboard/holdings/holdingsTableUtils"
import { getXirrDelta } from "@/lib/holdings/fundDetailMetrics"
import { cn } from "@/lib/utils"
import type { Holding } from "@/types/api"

interface FundPerformancePanelProps {
  holding: Holding
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${value.toFixed(1)}%`
}

export function FundPerformancePanel({ holding }: FundPerformancePanelProps) {
  const benchmarkName = getBenchmarkName(holding) ?? "Benchmark"
  const xirr = holding.xirr
  const benchmarkXirr = holding.benchmark_xirr
  const delta = getXirrDelta(holding)
  const maxRate = Math.max(xirr ?? 0, benchmarkXirr ?? 0, 1)
  const fundBarWidth = xirr != null ? (xirr / maxRate) * 100 : 0
  const benchmarkBarWidth = benchmarkXirr != null ? (benchmarkXirr / maxRate) * 100 : 0
  const displayedMissedGains = getDisplayedMissedGains(calculateMissedGains(holding))
  const missedGainsColorClass = getMissedGainsColorClass(displayedMissedGains)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance vs benchmark</CardTitle>
        <CardDescription>Client holding XIRR compared with category benchmark</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {delta !== null && (
            <Badge
              variant={delta >= 0 ? "default" : "destructive"}
              className="gap-1 text-sm font-medium"
            >
              {delta >= 0 ? (
                <TrendingUp className="size-3.5" aria-hidden />
              ) : (
                <TrendingDown className="size-3.5" aria-hidden />
              )}
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}% vs {benchmarkName}
            </Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Fund XIRR</span>
              <span className="font-mono tabular-nums">{formatPct(xirr)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${fundBarWidth}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Benchmark XIRR</span>
              <span className="font-mono tabular-nums">{formatPct(benchmarkXirr)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-muted-foreground/50 transition-all"
                style={{ width: `${benchmarkBarWidth}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Missed gains</p>
            <p className={cn("mt-1 font-mono text-lg font-semibold tabular-nums", missedGainsColorClass)}>
              {displayedMissedGains !== null ? formatSignedRupees(displayedMissedGains) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Absolute return</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {holding.return_pct != null ? `${holding.return_pct.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Entry date</p>
            <p className="mt-1 font-mono text-lg font-semibold">
              {holding.date_of_entry ?? "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
