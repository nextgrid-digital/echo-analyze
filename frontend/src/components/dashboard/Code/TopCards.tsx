import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { toLakhs } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

interface TopCardsProps {
  summary: AnalysisSummary
}

function TopCardsInner({ summary }: TopCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
      <Card className="border-border">
        <CardContent className="p-4 sm:p-6 lg:p-8 flex items-center justify-between relative">
          <div className="absolute top-4 right-4">
            <SectionInfoTooltip
              title="Total Invested"
              content={
                <>
                  Sum of the cost value of all holdings (what you paid). Calculated as
                  units × purchase NAV (or average cost) for each scheme, summed across
                  the portfolio.
                </>
              }
            />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">
              Total Invested
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground font-mono">
              {toLakhs(summary.total_cost_value)}
            </h2>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border">
        <CardContent className="p-4 sm:p-6 lg:p-8 flex items-center justify-between relative">
          <div className="absolute top-4 right-4">
            <SectionInfoTooltip
              title="Current Value & Return"
              content={
                <>
                  Current value is the sum of market value of all holdings (units ×
                  latest NAV). Absolute return % = (current value − total invested) ÷
                  total invested × 100.
                </>
              }
            />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">
              Current Value
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground font-mono">
              {toLakhs(summary.total_market_value)}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-primary font-bold text-base sm:text-lg font-mono">
              {summary.portfolio_return ?? 0}%
            </p>
            <p className="text-muted-foreground text-xs">Absolute Return</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const TopCards = memo(TopCardsInner)
