import { Badge } from "@/components/ui/badge"
import { getPerformanceStatus } from "@/lib/holdings/fundDetailMetrics"
import type { Holding } from "@/types/api"

interface FundDetailHeaderProps {
  holding: Holding
}

const STATUS_LABELS = {
  outperforming: "Outperforming",
  underperforming: "Underperforming",
  neutral: "In line with benchmark",
  unknown: "No benchmark",
} as const

const STATUS_VARIANTS = {
  outperforming: "default",
  underperforming: "destructive",
  neutral: "secondary",
  unknown: "outline",
} as const

export function FundDetailHeader({ holding }: FundDetailHeaderProps) {
  const status = getPerformanceStatus(holding)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {holding.scheme_name}
            </h1>
            <p className="text-sm text-muted-foreground">{holding.fund_family}</p>
            {holding.folio && (
              <p className="font-mono text-xs text-muted-foreground">Folio {holding.folio}</p>
            )}
          </div>
          <Badge variant={STATUS_VARIANTS[status]} className="shrink-0">
            {STATUS_LABELS[status]}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{holding.category}</Badge>
          <Badge variant="outline">{holding.sub_category}</Badge>
          {holding.style_category && (
            <Badge variant="outline">{holding.style_category}</Badge>
          )}
        </div>
      </div>
    </div>
  )
}
