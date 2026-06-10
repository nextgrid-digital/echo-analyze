import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import {
  formatYearsFromEntryDate,
} from "@/components/dashboard/holdings/holdingsTableUtils"
import { getFundWeightPct, getGainLoss } from "@/lib/holdings/fundDetailMetrics"
import { cn } from "@/lib/utils"
import type { Holding } from "@/types/api"

interface FundMetricsGridProps {
  holding: Holding
  totalMarketValue: number
  renderNowMs: number
}

function formatAum(value: number) {
  return `Rs ${formatCurrency(value)}`
}

export function FundMetricsGrid({
  holding,
  totalMarketValue,
  renderNowMs,
}: FundMetricsGridProps) {
  const gainLoss = getGainLoss(holding)
  const weightPct = getFundWeightPct(holding, totalMarketValue)
  const holdingPeriod = formatYearsFromEntryDate(holding.date_of_entry, renderNowMs)

  const metrics = [
    {
      label: "Current value",
      value: formatAum(holding.market_value),
    },
    {
      label: "Invested",
      value: formatAum(holding.cost_value || 0),
    },
    {
      label: "Gain / loss",
      value: `${gainLoss >= 0 ? "+" : "-"}Rs ${formatCurrency(Math.abs(gainLoss))}`,
      valueClassName: gainLoss >= 0 ? "text-emerald-600" : "text-rose-600",
    },
    {
      label: "Portfolio weight",
      value: `${weightPct.toFixed(2)}%`,
    },
    {
      label: "Units & NAV",
      value: `${holding.units.toLocaleString("en-IN", { maximumFractionDigits: 4 })} @ Rs ${formatCurrency(holding.nav)}`,
    },
    {
      label: "Holding period",
      value: holdingPeriod ?? (holding.date_of_entry || "—"),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader className="pb-2">
            <CardDescription>{metric.label}</CardDescription>
            <CardTitle
              className={cn("text-xl font-semibold tabular-nums", metric.valueClassName)}
            >
              {metric.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
