import { MARKETING_ANALYSIS } from "@/lib/marketing/fixtures"
import { formatPercent } from "@/lib/format"

const summary = MARKETING_ANALYSIS.summary!

function formatAum(value: number) {
  if (value >= 100_000) {
    return `₹${(value / 100_000).toFixed(1)}L`
  }
  return `₹${value.toLocaleString("en-IN")}`
}

export function WorkspaceSlicePreview() {
  return (
    <div className="bg-background p-6">
      <p className="mb-4 text-sm font-medium text-muted-foreground">Meeting preparation</p>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Portfolio</p>
          <p className="mt-1 font-mono text-lg font-semibold">
            {formatAum(summary.total_market_value)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">1Y XIRR</p>
          <p className="mt-1 font-mono text-lg font-semibold text-emerald-600">
            +{formatPercent(summary.portfolio_xirr ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Underperforming</p>
          <p className="mt-1 font-mono text-lg font-semibold text-amber-600">
            {formatPercent(summary.performance_summary?.one_year.underperforming_pct ?? 0)}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="text-sm font-medium">Review talking point</p>
        <p className="mt-1 text-sm text-muted-foreground">
          18% of portfolio value is underperforming vs benchmark over 1 year — discuss
          rebalancing options.
        </p>
      </div>
    </div>
  )
}
