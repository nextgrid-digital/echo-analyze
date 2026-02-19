import { memo, useMemo } from "react"
import { WideCard } from "./cards/WideCard"
import { ProgressBarWithLabel } from "./visualizations/ProgressBarWithLabel"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { CHART_COLORS } from "@/lib/chartColors"
import type { AnalysisSummary, AssetAllocation as AssetAlloc } from "@/types/api"

interface AssetAllocationProps {
  summary: AnalysisSummary
}

function AssetAllocationInner({ summary }: AssetAllocationProps) {
  const tableData = useMemo(() => {
    const alloc: AssetAlloc[] = summary.asset_allocation ?? []
    let equity = 0,
      liquidity = 0,
      market_debt = 0,
      others = 0

    // Group by main categories
    alloc.forEach((a) => {
      const cat = (a.category ?? "").toUpperCase()
      if (cat.includes("LIQUID") || cat.includes("OVERNIGHT") || cat.includes("MONEY MARKET")) {
        liquidity += a.value
      } else if (cat.includes("DEBT") || cat.includes("FIXED INCOME")) {
        market_debt += a.value
      } else if (
        cat.includes("EQUITY") ||
        cat.includes("CAP") ||
        cat.includes("ELSS")
      ) {
        equity += a.value
      } else {
        others += a.value
      }
    })

    const total = equity + liquidity + market_debt + others || 1

    // Create grouped table data
    const groupedTableData: AssetAlloc[] = []
    if (equity > 0) {
      groupedTableData.push({
        category: "Equity",
        value: equity,
        allocation_pct: parseFloat(((equity / total) * 100).toFixed(1))
      })
    }
    if (market_debt > 0) {
      groupedTableData.push({
        category: "Debt - Market",
        value: market_debt,
        allocation_pct: parseFloat(((market_debt / total) * 100).toFixed(1))
      })
    }
    if (liquidity > 0) {
      groupedTableData.push({
        category: "Liquidity",
        value: liquidity,
        allocation_pct: parseFloat(((liquidity / total) * 100).toFixed(1))
      })
    }
    if (others > 0) {
      groupedTableData.push({
        category: "Others",
        value: others,
        allocation_pct: parseFloat(((others / total) * 100).toFixed(1))
      })
    }

    return groupedTableData
  }, [summary.asset_allocation])

  return (
    <div className="mb-6 sm:mb-8">
      <WideCard>
        <div className="relative">
          <div className="absolute top-0 right-0">
            <SectionInfoTooltip
              title="Asset Allocation"
              formula={
                <>
                  Allocation % = (Category Value ÷ Total Portfolio Value) × 100
                </>
              }
              content={
                <>
                  Equity = categories containing &quot;Equity&quot;, &quot;Cap&quot;, or &quot;ELSS&quot;; Fixed Income = &quot;Liquid&quot; or &quot;Debt&quot;; rest = Others. Values are market value.
                </>
              }
            />
          </div>

          <h3 className="font-semibold text-lg text-foreground mb-6">Asset Allocation</h3>

          <div className="space-y-4">
            {tableData.map((item, i) => {
              const color = CHART_COLORS[i % CHART_COLORS.length]
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground font-mono">
                        {(item.value / 100_000).toFixed(2)}L
                      </span>
                      <span className="text-base font-bold text-foreground font-mono">
                        {item.allocation_pct}%
                      </span>
                    </div>
                  </div>
                  <ProgressBarWithLabel
                    value={item.allocation_pct}
                    max={100}
                    label=""
                    valueLabel=""
                    color={color}
                    height="md"
                    showValue={false}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </WideCard>
    </div>
  )
}

export const AssetAllocation = memo(AssetAllocationInner)
