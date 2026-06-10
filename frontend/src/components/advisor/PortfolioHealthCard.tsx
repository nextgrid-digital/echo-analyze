import { memo, useMemo } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { INSIGHT_TYPE_STYLES } from "@/lib/dashboardTheme"
import { formatPercent } from "@/lib/format"
import { getNormalizedEquityAllocationPct } from "@/lib/portfolioAnalysis"
import { cn } from "@/lib/utils"
import type { AnalysisSummary } from "@/types/api"

function buildInsights(summary: AnalysisSummary) {
  const insights: Array<{
    type: "info" | "warning" | "success"
    text: string
  }> = []

  const underperformingPct =
    summary.performance_summary?.one_year.underperforming_pct ?? 0
  if (underperformingPct > 0) {
    insights.push({
      type: "warning",
      text: `${formatPercent(underperformingPct)} of portfolio underperforming vs benchmark (1Y)`,
    })
  }

  const fundCount = summary.concentration?.fund_count ?? 0
  const amcCount = summary.concentration?.amc_count ?? 0
  if (fundCount > 15) {
    insights.push({
      type: "warning",
      text: `${fundCount} funds across ${amcCount} AMCs — higher than recommended`,
    })
  }

  const equityPct = getNormalizedEquityAllocationPct(summary)
  const targetEquity =
    summary.guidelines?.investment_guidelines?.asset_allocation.find(
      (a) => a.label === "Equity"
    )?.recommended ?? 80
  if (Math.abs(equityPct - targetEquity) <= 5) {
    insights.push({
      type: "success",
      text: `Equity allocation ${formatPercent(equityPct)} is within target range`,
    })
  } else if (equityPct > targetEquity) {
    insights.push({
      type: "warning",
      text: `Equity overweight at ${formatPercent(equityPct)} vs ${formatPercent(targetEquity)} target`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: "info",
      text: `Portfolio equity allocation: ${formatPercent(equityPct)}`,
    })
  }

  return insights
}

interface PortfolioHealthCardProps {
  summary: AnalysisSummary
  reportUrl?: string
}

export const PortfolioHealthCard = memo(function PortfolioHealthCard({
  summary,
  reportUrl = "/dashboard/report",
}: PortfolioHealthCardProps) {
  const insights = useMemo(() => buildInsights(summary), [summary])
  const allocation = summary.asset_allocation ?? []

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
        <CardTitle className="text-base">Portfolio Health</CardTitle>
        <CardDescription>Asset mix and key takeaways</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allocation.length > 0 ? (
          <div className="space-y-3">
            {allocation.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.category}</span>
                  <span className="font-mono font-medium">
                    {formatPercent(item.allocation_pct)}
                  </span>
                </div>
                <Progress value={item.allocation_pct} className="h-2" />
              </div>
            ))}
          </div>
        ) : null}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Key takeaways
          </p>
          <ul className="space-y-2">
            {insights.map((insight) => (
              <li
                key={insight.text}
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                  INSIGHT_TYPE_STYLES[insight.type].surface
                )}
              >
                {getIcon(insight.type)}
                <span>{insight.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <Link
          to={reportUrl}
          className="text-sm font-medium text-primary hover:underline"
        >
          View full analysis →
        </Link>
      </CardContent>
    </Card>
  )
})
