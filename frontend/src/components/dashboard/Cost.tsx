import { memo } from "react"
import { CompactCard } from "./cards/CompactCard"
import { WideCard } from "./cards/WideCard"
import { ProgressBarWithLabel } from "./visualizations/ProgressBarWithLabel"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { AlertTriangle, TrendingDown, DollarSign } from "lucide-react"
import { toLakhs } from "@/lib/format"
import type { CostData } from "@/types/api"

interface CostProps {
  cost: CostData
}

function CostInner({ cost }: CostProps) {
  const costPct = cost.portfolio_cost_pct ?? 0
  const isHighCost = costPct > 1.5
  const isModerateCost = costPct > 1.0 && costPct <= 1.5
  const costColor = isHighCost ? "#dc2626" : isModerateCost ? "#f59e0b" : "#059669"

  return (
    <div className="mb-6 sm:mb-8">
      {/* Cost Metrics - Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${isHighCost ? "text-red-600" : isModerateCost ? "text-amber-500" : "text-green-600"}`} />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Portfolio Cost
              </p>
            </div>
            <SectionInfoTooltip
              title="Portfolio Cost"
              formula={
                <>
                  Portfolio Cost % = Weighted Average TER<br />
                  Annual Cost = Portfolio Value × Cost %
                </>
              }
              content={
                <>
                  Weighted average of Total Expense Ratios (TER) across all funds in the portfolio.
                </>
              }
            />
          </div>
          <p className={`text-xl font-bold font-mono mb-1 ${isHighCost ? "text-red-600" : isModerateCost ? "text-amber-600" : "text-foreground"}`}>
            {cost.portfolio_cost_pct}%
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {toLakhs(cost.annual_cost)} Annual
          </p>
        </CompactCard>

        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Cost Paid
            </p>
            <SectionInfoTooltip
              title="Total Cost Paid"
              formula={
                <>
                  Total Cost Paid = Σ(Exit Load + Advisory Fees + Other Charges)
                </>
              }
              content={
                <>
                  Cumulative charges paid so far including exit loads, advisory fees, and other charges.
                </>
              }
            />
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {toLakhs(cost.total_cost_paid)}
          </p>
        </CompactCard>

        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Potential Savings
              </p>
            </div>
            <SectionInfoTooltip
              title="Potential Savings"
              formula={
                <>
                  Savings = Regular Value × (TER_Regular − TER_Direct) × Time Period
                </>
              }
              content={
                <>
                  Estimated savings if the regular portion were switched to direct plans or low-cost index funds.
                </>
              }
            />
          </div>
          <p className="text-xl font-bold text-primary font-mono">
            {toLakhs(cost.savings_value)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            By switching to direct plans
          </p>
        </CompactCard>

        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Direct %
              </p>
            </div>
            <SectionInfoTooltip
              title="Direct Plan Percentage"
              formula={
                <>
                  Direct % = (Direct Plans Value ÷ Total Portfolio Value) × 100
                </>
              }
              content={
                <>
                  Percentage of portfolio invested in direct plans (lower cost) vs regular plans.
                </>
              }
            />
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {cost.direct_pct?.toFixed(1) ?? 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {cost.regular_pct?.toFixed(1) ?? 0}% Regular
          </p>
        </CompactCard>
      </div>

      {/* Cost Visualization */}
      <WideCard>
        <div className="relative">
          <div className="absolute top-0 right-0">
            <SectionInfoTooltip
              title="Portfolio Cost Analysis"
              formula={
                <>
                  Portfolio Cost % = Weighted Average TER<br />
                  Recommended: &lt; 1.5% for optimal returns
                </>
              }
              content={
                <>
                  Visual representation of portfolio cost percentage. Lower costs lead to better net returns over time.
                </>
              }
            />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className={`w-5 h-5 ${isHighCost ? "text-red-600" : isModerateCost ? "text-amber-500" : "text-green-600"}`} />
            <h3 className="font-semibold text-base text-foreground">
              Portfolio Cost Analysis
            </h3>
            {isHighCost && (
              <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 rounded-none uppercase">
                High
              </span>
            )}
          </div>
          <ProgressBarWithLabel
            value={cost.portfolio_cost_pct}
            max={3}
            label="Portfolio Cost Percentage"
            valueLabel={`${cost.portfolio_cost_pct}%`}
            color={costColor}
            height="lg"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Recommended: &lt; 1.5% for optimal returns
          </p>
        </div>
      </WideCard>
    </div>
  )
}

export const Cost = memo(CostInner)
