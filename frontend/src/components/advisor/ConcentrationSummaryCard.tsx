import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPercent } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

interface ConcentrationSummaryCardProps {
  summary: AnalysisSummary
}

export function ConcentrationSummaryCard({ summary }: ConcentrationSummaryCardProps) {
  const concentration = summary.concentration
  const top5Pct =
    concentration?.top_funds?.slice(0, 5).reduce((sum, f) => sum + f.allocation_pct, 0) ?? 0
  const top3AmcPct =
    concentration?.top_amcs?.slice(0, 3).reduce((sum, a) => sum + a.allocation_pct, 0) ?? 0

  const items = [
    {
      label: "Top 5 funds",
      value: top5Pct,
      status: top5Pct > 40 ? "High" : top5Pct > 25 ? "Moderate" : "Low",
    },
    {
      label: "Top 3 AMCs",
      value: top3AmcPct,
      status: top3AmcPct > 50 ? "High" : top3AmcPct > 35 ? "Moderate" : "Low",
    },
    {
      label: "Fund count",
      value: concentration?.fund_count ?? 0,
      status: (concentration?.fund_count ?? 0) > 20 ? "High" : "Moderate",
      isCount: true,
    },
  ]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Portfolio Concentration</CardTitle>
        <CardDescription>Fund and AMC concentration metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">
                {item.isCount ? item.value : formatPercent(item.value as number)}
              </span>
              <Badge
                variant={
                  item.status === "High"
                    ? "destructive"
                    : item.status === "Moderate"
                      ? "secondary"
                      : "outline"
                }
              >
                {item.status}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
