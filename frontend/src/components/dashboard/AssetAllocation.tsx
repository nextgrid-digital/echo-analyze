import { memo, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { WideCard } from "./cards/WideCard"
import { ProgressBarWithLabel } from "./visualizations/ProgressBarWithLabel"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { CHART_COLORS } from "@/lib/chartColors"
import { classifyAllocationCategory } from "@/lib/portfolioAnalysis"
import type {
  AnalysisSummary,
  AssetAllocation as AssetAlloc,
  Holding,
} from "@/types/api"

interface AssetAllocationProps {
  summary: AnalysisSummary
  holdings: Holding[]
}

interface OtherFundItem {
  scheme_name: string
  sub_category: string
  value: number
  allocation_pct: number
}

function AssetAllocationInner({ summary, holdings }: AssetAllocationProps) {
  const [isOthersOpen, setIsOthersOpen] = useState(false)

  const { tableData, othersBreakdown, otherFunds } = useMemo(() => {
    const alloc: AssetAlloc[] = summary.asset_allocation ?? []
    let equity = 0
    let liquidity = 0
    let marketDebt = 0
    let others = 0
    const rawOthersBreakdown: AssetAlloc[] = []

    alloc.forEach((item) => {
      const value = item.value ?? 0
      const category = item.category ?? ""

      switch (classifyAllocationCategory(category)) {
        case "liquidity":
          liquidity += value
          break
        case "market_debt":
          marketDebt += value
          break
        case "equity":
          equity += value
          break
        default:
          others += value
          rawOthersBreakdown.push(item)
          break
      }
    })

    const total = equity + liquidity + marketDebt + others || 1
    const groupedTableData: AssetAlloc[] = []

    if (equity > 0) {
      groupedTableData.push({
        category: "Equity",
        value: equity,
        allocation_pct: parseFloat(((equity / total) * 100).toFixed(1)),
      })
    }

    if (marketDebt > 0) {
      groupedTableData.push({
        category: "Debt - Market",
        value: marketDebt,
        allocation_pct: parseFloat(((marketDebt / total) * 100).toFixed(1)),
      })
    }

    if (liquidity > 0) {
      groupedTableData.push({
        category: "Liquidity",
        value: liquidity,
        allocation_pct: parseFloat(((liquidity / total) * 100).toFixed(1)),
      })
    }

    if (others > 0) {
      groupedTableData.push({
        category: "Others",
        value: others,
        allocation_pct: parseFloat(((others / total) * 100).toFixed(1)),
      })
    }

    const othersBreakdown = rawOthersBreakdown
      .map((item) => ({
        category: item.category,
        value: item.value,
        allocation_pct: parseFloat(((item.value / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.value - a.value)

    const otherFundMap = new Map<
      string,
      { scheme_name: string; sub_category: string; value: number }
    >()

    holdings.forEach((holding) => {
      const subCategory =
        holding.sub_category || holding.category || "Uncategorized"
      const groupedAsOthers =
        classifyAllocationCategory(subCategory) === "others" ||
        (holding.category ?? "").toUpperCase() === "OTHERS"

      if (!groupedAsOthers) {
        return
      }

      const key = `${holding.scheme_name}__${subCategory}`
      const existing = otherFundMap.get(key)
      if (existing) {
        existing.value += holding.market_value || 0
      } else {
        otherFundMap.set(key, {
          scheme_name: holding.scheme_name,
          sub_category: subCategory,
          value: holding.market_value || 0,
        })
      }
    })

    const otherFunds: OtherFundItem[] = Array.from(otherFundMap.values())
      .sort((a, b) => b.value - a.value)
      .map((item) => ({
        ...item,
        allocation_pct: parseFloat(((item.value / total) * 100).toFixed(1)),
      }))

    return {
      tableData: groupedTableData,
      othersBreakdown,
      otherFunds,
    }
  }, [holdings, summary.asset_allocation])

  return (
    <div className="mb-6 sm:mb-8">
      <WideCard>
        <div className="relative">
          <div className="absolute top-0 right-0">
            <SectionInfoTooltip
              title="Asset Allocation"
              formula={
                <>
                  Allocation % = (Category Value / Total Portfolio Value) * 100
                </>
              }
              content={
                <>
                  Equity = categories containing "Equity", "Cap", or "ELSS";
                  Fixed Income = "Liquid" or "Debt"; rest = Others. Values are
                  market value.
                </>
              }
            />
          </div>

          <h3 className="font-semibold text-lg text-foreground mb-6">
            Asset Allocation
          </h3>

          <div className="space-y-4">
            {tableData.map((item, i) => {
              const color = CHART_COLORS[i % CHART_COLORS.length]
              const isOthers = item.category === "Others"
              const hasOthersDetails =
                othersBreakdown.length > 0 || otherFunds.length > 0

              if (isOthers && hasOthersDetails) {
                const previewFunds = otherFunds.slice(0, 8)
                return (
                  <Collapsible
                    key={item.category}
                    open={isOthersOpen}
                    onOpenChange={setIsOthersOpen}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-foreground">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-sm text-muted-foreground font-mono">
                          {(item.value / 100_000).toFixed(2)}L
                        </span>
                        <span className="text-base font-bold text-foreground font-mono">
                          {item.allocation_pct}%
                        </span>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-none border border-border/60 bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            aria-label={
                              isOthersOpen
                                ? "Collapse others details"
                                : "Expand others details"
                            }
                          >
                            {isOthersOpen ? "Hide" : "Details"}
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-300 ${
                                isOthersOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </CollapsibleTrigger>
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
                    <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-out data-[state=closed]:max-h-0 data-[state=open]:max-h-[560px] data-[state=closed]:opacity-0 data-[state=open]:opacity-100">
                      <div className="mt-3 rounded-none border border-border/60 bg-muted/20 p-3 sm:p-4">
                        <div className="space-y-3">
                          {othersBreakdown.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Categories in Others
                              </p>
                              {othersBreakdown.map((detail) => (
                                <div
                                  key={`others-category-${detail.category}`}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  <span className="truncate text-foreground">
                                    {detail.category}
                                  </span>
                                  <span className="whitespace-nowrap font-mono text-muted-foreground">
                                    {(detail.value / 100_000).toFixed(2)}L (
                                    {detail.allocation_pct}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {previewFunds.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Funds in Others
                              </p>
                              {previewFunds.map((fund) => (
                                <div
                                  key={`others-fund-${fund.scheme_name}-${fund.sub_category}`}
                                  className="flex items-start justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">
                                      {fund.scheme_name}
                                    </p>
                                    <p className="truncate text-muted-foreground">
                                      {fund.sub_category}
                                    </p>
                                  </div>
                                  <span className="whitespace-nowrap font-mono text-muted-foreground">
                                    {(fund.value / 100_000).toFixed(2)}L (
                                    {fund.allocation_pct}%)
                                  </span>
                                </div>
                              ))}
                              {otherFunds.length > previewFunds.length && (
                                <p className="text-[11px] text-muted-foreground">
                                  Showing top {previewFunds.length} of{" "}
                                  {otherFunds.length} funds by value.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              }

              return (
                <div key={item.category}>
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