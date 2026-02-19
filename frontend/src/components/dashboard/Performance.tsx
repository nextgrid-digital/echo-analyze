import { memo } from "react"
import { CompactCard } from "./cards/CompactCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react"
import { formatPercent } from "@/lib/format"
import type { PerformanceSummary as PerfSummary } from "@/types/api"

interface PerformanceProps {
  performance: PerfSummary
}

export const Performance = memo(function Performance({ performance }: PerformanceProps) {
  const p = performance
  const totalUnderperforming = p.one_year.underperforming_pct
  const performing = 100 - totalUnderperforming
  const upto3Pct = p.one_year.upto_3_pct
  const moreThan3Pct = p.one_year.more_than_3_pct

  return (
    <div className="mb-6 sm:mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Performing card */}
        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Performing
              </p>
            </div>
            <SectionInfoTooltip
              title="Performing Funds"
              formula={
                <>
                  Performing % = 100% − Total Underperforming %<br />
                  Funds meeting or exceeding benchmark returns
                </>
              }
              content={
                <>
                  Percentage of portfolio (by value) where funds are performing at or above their respective benchmark returns over 1 year.
                </>
              }
            />
          </div>
          <p className="text-lg font-bold text-green-600 font-mono mb-1">
            {formatPercent(performing)}
          </p>
          <p className="text-xs text-muted-foreground">Meeting/exceeding benchmark</p>
        </CompactCard>

        {/* Total Underperforming card */}
        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Underperforming
              </p>
            </div>
            <div className="flex items-center gap-2">
              {totalUnderperforming > 0 && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${
                    totalUnderperforming > 20
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  }`}
                >
                  {totalUnderperforming > 20 ? "High" : "Moderate"}
                </Badge>
              )}
              <SectionInfoTooltip
                title="Total Underperforming"
                formula={
                  <>
                    Underperformance % = (Scheme Return − Benchmark Return) when negative<br />
                    Portfolio Underperformance % = Σ(Underperforming Holdings Value) ÷ Total Portfolio Value × 100
                  </>
                }
                content={
                  <>
                    Percentage of portfolio (by value) where funds underperformed their benchmark over 1 year. Compared to scheme-level benchmarks (e.g. Nifty 50, CRISIL indices).
                  </>
                }
              />
            </div>
          </div>
          <p className={`text-lg font-bold font-mono mb-1 ${
            totalUnderperforming > 20 ? "text-red-600" : "text-amber-600"
          }`}>
            {formatPercent(totalUnderperforming)}
          </p>
          <p className="text-xs text-muted-foreground">Below benchmark returns</p>
        </CompactCard>

        {/* Upto 3% Underperformance card */}
        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Upto 3% Gap
              </p>
            </div>
            <SectionInfoTooltip
              title="Upto 3% Underperformance"
              formula={
                <>
                  Underperformance % = (Scheme Return − Benchmark Return) when negative<br />
                  Filtered for: −3% ≤ Underperformance % ≤ 0%
                </>
              }
              content={
                <>
                  Percentage of portfolio where funds underperformed by 3% or less compared to their benchmark. Minor underperformance that may be within normal variance.
                </>
              }
            />
          </div>
          <p className="text-lg font-bold text-amber-600 font-mono mb-1">
            {formatPercent(upto3Pct)}
          </p>
          <p className="text-xs text-muted-foreground">Underperformance ≤ 3%</p>
        </CompactCard>

        {/* More than 3% Underperformance card */}
        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                &gt;3% Gap
              </p>
            </div>
            <div className="flex items-center gap-2">
              {moreThan3Pct > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1"
                >
                  Critical
                </Badge>
              )}
              <SectionInfoTooltip
                title="More than 3% Underperformance"
                formula={
                  <>
                    Underperformance % = (Scheme Return − Benchmark Return) when negative<br />
                    Filtered for: Underperformance % &lt; −3%
                  </>
                }
                content={
                  <>
                    Percentage of portfolio where funds underperformed by more than 3% compared to their benchmark. Significant underperformance requiring attention.
                  </>
                }
              />
            </div>
          </div>
          <p className="text-lg font-bold text-red-600 font-mono mb-1">
            {formatPercent(moreThan3Pct)}
          </p>
          <p className="text-xs text-muted-foreground">Underperformance &gt; 3%</p>
        </CompactCard>
      </div>
    </div>
  )
})
