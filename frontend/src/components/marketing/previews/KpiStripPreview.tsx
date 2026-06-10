import { AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react"
import { MARKETING_ANALYSIS } from "@/lib/marketing/fixtures"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

const performance = MARKETING_ANALYSIS.summary!.performance_summary!
const comparableCoverage = performance.one_year.comparable_pct ?? 0
const totalUnderperforming = performance.one_year.underperforming_pct
const performing = Math.max(0, comparableCoverage - totalUnderperforming)

const KPI_ITEMS = [
  {
    label: "Performing",
    value: formatPercent(performing),
    tone: "text-emerald-600",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
  {
    label: "Underperforming",
    value: formatPercent(totalUnderperforming),
    tone: totalUnderperforming > 20 ? "text-red-600" : "text-amber-600",
    icon: AlertTriangle,
    iconClass: "text-amber-500",
  },
  {
    label: "Upto 3% Gap",
    value: formatPercent(performance.one_year.upto_3_pct),
    tone: "text-amber-600",
    icon: TrendingDown,
    iconClass: "text-violet-600",
  },
  {
    label: ">3% Gap",
    value: formatPercent(performance.one_year.more_than_3_pct),
    tone: "text-red-600",
    icon: TrendingDown,
    iconClass: "text-rose-600",
  },
] as const

export function KpiStripPreview() {
  return (
    <div className="bg-background p-6">
      <p className="mb-4 text-sm font-medium text-muted-foreground">Performance overview</p>
      <div className="grid grid-cols-2 gap-4">
        {KPI_ITEMS.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-card px-4 py-4"
          >
            <div className="flex items-center gap-2">
              <item.icon className={cn("h-4 w-4 shrink-0", item.iconClass)} />
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
            <p className={cn("mt-2 font-mono text-2xl font-semibold tabular-nums", item.tone)}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
