import { memo, useMemo } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { INSIGHT_TYPE_STYLES } from "@/lib/dashboardTheme"
import { formatPercent } from "@/lib/format"
import { getNormalizedEquityAllocationPct } from "@/lib/portfolioAnalysis"
import { cn } from "@/lib/utils"
import type { AnalysisSummary } from "@/types/api"

interface PerformanceInsightsCardProps {
  summary: AnalysisSummary
}

function PerformanceInsightsCardInner({ summary }: PerformanceInsightsCardProps) {
  const insights = useMemo(() => {
    const insightsList: Array<{
      type: "info" | "warning" | "success"
      label: string
      value: string
    }> = []

    const underperformingPct =
      summary.performance_summary?.one_year.underperforming_pct ?? 0
    if (underperformingPct > 0) {
      insightsList.push({
        type: "warning",
        label: "Underperforming (1Y)",
        value: `${underperformingPct}% portfolio value`,
      })
    }

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

    const xirr = summary.portfolio_xirr
    const benchmarkXirr = summary.benchmark_xirr
    if (
      xirr != null &&
      benchmarkXirr != null
    ) {
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
        return <AlertCircle className={cn("h-4 w-4 shrink-0", iconClass)} />
      case "success":
        return <CheckCircle2 className={cn("h-4 w-4 shrink-0", iconClass)} />
      default:
        return <Info className={cn("h-4 w-4 shrink-0", iconClass)} />
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Key Insights</CardTitle>
            <CardDescription>Performance and allocation signals</CardDescription>
          </div>
          <SectionInfoTooltip
            title="Key Insights Summary"
            formula={
              <>
                Underperformance % = Sum(Underperforming Holdings Value) / Total Portfolio Value x 100<br />
                Equity Allocation % = (Equity Value / Total Portfolio Value) x 100
              </>
            }
            content={
              <>
                Key portfolio health indicators showing performance and allocation status from your portfolio data.
              </>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {insights.length > 0 ? (
          <ul className="space-y-2">
            {insights.map((insight) => (
              <li
                key={`${insight.label}-${insight.value}`}
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2",
                  INSIGHT_TYPE_STYLES[insight.type].surface
                )}
              >
                {getIcon(insight.type)}
                <div className="min-w-0">
                  <p className={cn("text-xs", INSIGHT_TYPE_STYLES[insight.type].label)}>
                    {insight.label}
                  </p>
                  <p className="text-sm font-semibold">{insight.value}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No key insights available</p>
        )}
      </CardContent>
    </Card>
  )
}

export const PerformanceInsightsCard = memo(PerformanceInsightsCardInner)
