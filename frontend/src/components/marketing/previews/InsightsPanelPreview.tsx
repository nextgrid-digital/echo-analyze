import { AlertCircle, CheckCircle2 } from "lucide-react"
import { MARKETING_ANALYSIS } from "@/lib/marketing/fixtures"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

const summary = MARKETING_ANALYSIS.summary!

const INSIGHTS = [
  {
    type: "warning" as const,
    label: "Underperforming (1Y)",
    value: `${summary.performance_summary?.one_year.underperforming_pct ?? 18}% portfolio value`,
  },
  {
    type: "info" as const,
    label: "Equity Allocation",
    value: formatPercent(summary.equity_pct ?? 68),
  },
  {
    type: "success" as const,
    label: "XIRR vs Benchmark",
    value: `+${formatPercent(summary.portfolio_xirr ?? 14.2)} vs +${formatPercent(summary.benchmark_xirr ?? 12.8)}`,
  },
]

const surfaceStyles = {
  warning: "border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30",
  info: "border-border bg-muted/30",
  success: "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30",
}

export function InsightsPanelPreview() {
  return (
    <div className="bg-background p-6">
      <div className="mb-4">
        <p className="text-base font-semibold tracking-tight">Key Insights</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Performance and allocation signals
        </p>
      </div>
      <ul className="space-y-3">
        {INSIGHTS.map((insight) => (
          <li
            key={insight.label}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3",
              surfaceStyles[insight.type]
            )}
          >
            {insight.type === "warning" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            ) : insight.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">{insight.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{insight.value}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
