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
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">
        Portfolio Cost
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        <Card className="border-slate-100">
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
            <h3 className="font-bold text-lg text-slate-800 mb-6">
              Fund Types
            </h3>
            <div className="flex justify-between text-xs font-bold uppercase mb-2">
              <span className="text-emerald-500">
                Direct funds {cost.direct_pct}%
              </span>
              <span className="text-indigo-500">
                Regular funds {cost.regular_pct}%
              </span>
            </div>
            <div className="w-full h-8 bg-slate-100 rounded-full overflow-hidden flex mb-6 sm:mb-8">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${cost.direct_pct}%` }}
              />
              <div
                className="h-full bg-indigo-400"
                style={{ width: `${cost.regular_pct}%` }}
              />
            </div>
            <div className="bg-red-50/50 p-4 sm:p-6 rounded-2xl border border-red-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-red-500 text-lg">⚠️</span>
                <span className="font-bold text-slate-800 text-sm">
                  High Portfolio Cost
                </span>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                    Your Portfolio Cost
                  </p>
                  <h4 className="text-xl font-bold text-slate-800">
                    {cost.portfolio_cost_pct}%
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    {toLakhs(cost.annual_cost)} Annual
                  </p>
                </div>
                <div className="text-red-600">
                  <p className="text-red-400 text-[10px] font-bold uppercase mb-1">
                    Total Cost paid
                  </p>
                  <h4 className="text-2xl font-bold">
                    {toLakhs(cost.total_cost_paid)}
                  </h4>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
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
            <h3 className="font-bold text-lg text-slate-800 mb-6">
              Historical Cost Estimate:
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                <span className="text-slate-500 font-bold">
                  Additional Cost Savings
                </span>
                <span className="text-emerald-500 font-bold">
                  {toLakhs(cost.savings_value)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-wider font-bold">
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
