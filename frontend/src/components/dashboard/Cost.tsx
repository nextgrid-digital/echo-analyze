import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { toLakhs } from "@/lib/format"
import type { CostData } from "@/types/api"

interface CostProps {
  cost: CostData
}

function CostInner({ cost }: CostProps) {
  return (
    <div className="mb-8 sm:mb-12">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
        Portfolio Cost
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        <Card className="border-border">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="Fund Types & Portfolio Cost"
                content={
                  <>
                    Direct % vs Regular % = share of portfolio in direct vs regular
                    plans. Portfolio cost % is a weighted average of Total Expense
                    Ratios (TER). Annual cost = portfolio value × cost %; total cost
                    paid is cumulative charges (e.g. exit load, advisory) paid so far.
                  </>
                }
              />
            </div>
            <div className="bg-destructive/10 p-4 sm:p-6 rounded-2xl border border-destructive/30">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-destructive text-lg">⚠️</span>
                <span className="font-bold text-foreground text-sm">
                  High Portfolio Cost
                </span>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase mb-1">
                    Your Portfolio Cost
                  </p>
                  <h4 className="text-xl font-bold text-foreground font-mono">
                    {cost.portfolio_cost_pct}%
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-bold mt-1 font-mono">
                    {toLakhs(cost.annual_cost)} Annual
                  </p>
                </div>
                <div className="text-destructive">
                  <p className="text-destructive/80 text-[10px] font-bold uppercase mb-1">
                    Total Cost paid
                  </p>
                  <h4 className="text-2xl font-bold font-mono">
                    {toLakhs(cost.total_cost_paid)}
                  </h4>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="Historical Cost Estimate"
                content={
                  <>
                    Additional cost savings = estimated savings if the regular portion
                    were switched to direct plans (or low-cost index). Calculated using
                    the difference in TER between regular and direct, applied to the
                    regular portion of the portfolio over time.
                  </>
                }
              />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-6">
              Historical Cost Estimate:
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm py-2 border-b border-border">
                <span className="text-muted-foreground font-bold">
                  Additional Cost Savings
                </span>
                <span className="text-primary font-bold font-mono">
                  {toLakhs(cost.savings_value)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider font-bold">
                Calculating savings by moving regular funds to direct funds or
                low-cost index funds.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const Cost = memo(CostInner)
