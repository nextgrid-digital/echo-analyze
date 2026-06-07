import { memo, useMemo } from "react"
import { WideCard } from "./cards/WideCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { INSIGHT_TYPE_STYLES } from "@/lib/dashboardTheme"
import { formatPercent } from "@/lib/format"
import { getNormalizedEquityAllocationPct } from "@/lib/portfolioAnalysis"
import { cn } from "@/lib/utils"
import type { AnalysisSummary } from "@/types/api"

interface ExecutiveSummaryProps {
  summary: AnalysisSummary
}

function ExecutiveSummaryInner({ summary }: ExecutiveSummaryProps) {
  const insights = useMemo(() => {
    const insightsList: Array<{
      type: "info" | "warning" | "success"
      label: string
      value: string
    }> = []

    // Portfolio health indicators
    const underperformingPct =
      summary.performance_summary?.one_year.underperforming_pct ?? 0
    if (underperformingPct > 0) {
      insightsList.push({
        type: "warning",
        label: "Underperforming (1Y)",
        value: `${underperformingPct}% portfolio value`,
      })
    }

    // Allocation status
    const equityPct = getNormalizedEquityAllocationPct(summary)
    const guidelines = summary.guidelines
    if (guidelines?.investment_guidelines) {
      const targetEquity =
        guidelines.investment_guidelines.asset_allocation.find(
          (a) => a.label === "Equity"
        )?.recommended ?? 80
      const gap = equityPct - targetEquity
      if (Math.abs(gap) > 5) {
        insightsList.push({
          type: gap > 0 ? "warning" : "info",
          label: "Equity Allocation",
          value: `${formatPercent(equityPct)} (Target: ${formatPercent(targetEquity)})`,
        })
      } else {
        insightsList.push({
          type: "success",
          label: "Equity Allocation",
          value: `${formatPercent(equityPct)} (Within Target)`,
        })
      }
    } else {
      insightsList.push({
        type: "info",
        label: "Equity Allocation",
        value: formatPercent(equityPct),
      })
    }

    // XIRR vs Benchmark
    const xirr = summary.portfolio_xirr
    const benchmarkXirr = summary.benchmark_xirr
    if (xirr !== null && xirr !== undefined && benchmarkXirr !== null && benchmarkXirr !== undefined) {
      const diff = xirr - benchmarkXirr
      if (diff < -2) {
        insightsList.push({
          type: "warning",
          label: "XIRR vs Benchmark",
          value: `${formatPercent(xirr)} vs ${formatPercent(benchmarkXirr)}`,
        })
      } else if (diff > 2) {
        insightsList.push({
          type: "success",
          label: "XIRR vs Benchmark",
          value: `${formatPercent(xirr)} vs ${formatPercent(benchmarkXirr)}`,
        })
      }
    }

    return insightsList
  }, [summary])

  const getIcon = (type: keyof typeof INSIGHT_TYPE_STYLES) => {
    const iconClass = INSIGHT_TYPE_STYLES[type].icon
    switch (type) {
      case "warning":
        return <AlertCircle className={cn("h-4 w-4", iconClass)} />
      case "success":
        return <CheckCircle2 className={cn("h-4 w-4", iconClass)} />
      default:
        return <Info className={cn("h-4 w-4", iconClass)} />
    }
  }

  return (
    <WideCard accent="indigo">
      <div className="relative">
        <div className="absolute top-0 right-0">
          <SectionInfoTooltip
            title="Key Insights Summary"
            formula={
              <>
                Underperformance % = Sum(Underperforming Holdings Value) / Total Portfolio Value x 100<br />
                Equity Allocation % = (Equity Value / Total Portfolio Value) x 100<br />
                Gap = Current % - Target %
              </>
            }
            content={
              <>
                Key portfolio health indicators showing performance, cost, and allocation status. All values are calculated from your portfolio data.
              </>
            }
          />
        </div>
        <h3 className="mb-4 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg">
          Key Insights Summary
        </h3>
        {insights.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-3.5",
                  INSIGHT_TYPE_STYLES[insight.type].surface
                )}
              >
                {getIcon(insight.type)}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "mb-1 text-xs",
                      INSIGHT_TYPE_STYLES[insight.type].label
                    )}
                  >
                    {insight.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {insight.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No key insights available
          </p>
        )}
      </div>
    </WideCard>
  )
}

export const ExecutiveSummary = memo(ExecutiveSummaryInner)