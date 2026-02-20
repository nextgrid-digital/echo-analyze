import { memo, useMemo } from "react"
import { WideCard } from "./cards/WideCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { formatPercent } from "@/lib/format"
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
        label: "Underperforming Funds",
        value: `${underperformingPct}% of portfolio`,
      })
    }

    // Allocation status
    const equityPct = summary.equity_pct ?? 0
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
          value: `${equityPct.toFixed(1)}% (Target: ${targetEquity}%)`,
        })
      } else {
        insightsList.push({
          type: "success",
          label: "Equity Allocation",
          value: `${equityPct.toFixed(1)}% (Within Target)`,
        })
      }
    } else {
      insightsList.push({
        type: "info",
        label: "Equity Allocation",
        value: `${equityPct.toFixed(1)}%`,
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

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <WideCard>
      <div className="relative">
        <div className="absolute top-0 right-0">
          <SectionInfoTooltip
            title="Key Insights Summary"
            formula={
              <>
                Underperformance % = Σ(Underperforming Holdings Value) ÷ Total Portfolio Value × 100<br />
                Equity Allocation % = (Equity Value ÷ Total Portfolio Value) × 100<br />
                Gap = Current % − Target %
              </>
            }
            content={
              <>
                Key portfolio health indicators showing performance, cost, and allocation status. All values are calculated from your portfolio data.
              </>
            }
          />
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-4">
          Key Insights Summary
        </h3>
        {insights.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-3 bg-muted/30 border border-border/50"
              >
                {getIcon(insight.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
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
