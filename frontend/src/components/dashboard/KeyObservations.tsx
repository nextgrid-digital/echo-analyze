import { memo, useMemo } from "react"
import { WideCard } from "./cards/WideCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { AlertTriangle, TrendingUp, DollarSign, BarChart3 } from "lucide-react"
import { formatPercent, toLakhs } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

interface KeyObservationsProps {
  summary: AnalysisSummary
}

function KeyObservationsInner({ summary }: KeyObservationsProps) {
  const observations = useMemo(() => {
    const obs: Array<{
      category: "performance" | "risk" | "cost" | "allocation"
      icon: React.ReactNode
      title: string
      items: string[]
    }> = []

    // Performance Highlights
    const perfItems: string[] = []
    const xirr = summary.portfolio_xirr
    const benchmarkXirr = summary.benchmark_xirr
    const returnPct = summary.portfolio_return ?? 0

    if (xirr !== null && xirr !== undefined) {
      perfItems.push(`Portfolio XIRR: ${formatPercent(xirr)}`)
    }
    if (benchmarkXirr !== null && benchmarkXirr !== undefined) {
      perfItems.push(`Benchmark XIRR: ${formatPercent(benchmarkXirr)}`)
      if (xirr !== null && xirr !== undefined) {
        const diff = xirr - benchmarkXirr
        if (Math.abs(diff) > 0.1) {
          perfItems.push(
            `Performance Gap: ${diff > 0 ? "+" : ""}${formatPercent(diff)}`
          )
        }
      }
    }
    if (returnPct > 0) {
      perfItems.push(`Absolute Return: ${formatPercent(returnPct)}`)
    }

    const underperformingPct =
      summary.performance_summary?.one_year.underperforming_pct ?? 0
    if (underperformingPct > 0) {
      perfItems.push(
        `${underperformingPct}% of portfolio underperforming benchmark`
      )
    }

    if (perfItems.length > 0) {
      obs.push({
        category: "performance",
        icon: <TrendingUp className="w-5 h-5 text-primary" />,
        title: "Performance Highlights",
        items: perfItems,
      })
    }

    // Risk Highlights
    const riskItems: string[] = []
    const equityPct = summary.equity_pct ?? 0
    riskItems.push(`Equity Allocation: ${formatPercent(equityPct)}`)

    const fundCount = summary.concentration?.fund_count ?? 0
    const amcCount = summary.concentration?.amc_count ?? 0
    if (fundCount > 0) {
      riskItems.push(`${fundCount} funds across ${amcCount} AMCs`)
    }

    const fundStatus = summary.concentration?.fund_status
    const amcStatus = summary.concentration?.amc_status
    if (fundStatus) {
      riskItems.push(`Fund Diversification: ${fundStatus}`)
    }
    if (amcStatus) {
      riskItems.push(`AMC Diversification: ${amcStatus}`)
    }

    if (riskItems.length > 0) {
      obs.push({
        category: "risk",
        icon: <BarChart3 className="w-5 h-5 text-primary" />,
        title: "Risk & Diversification",
        items: riskItems,
      })
    }

    // Cost & Tax Highlights
    const costItems: string[] = []
    const costPct = summary.cost?.portfolio_cost_pct ?? 0
    const annualCost = summary.cost?.annual_cost ?? 0

    if (costPct > 0) {
      costItems.push(`Portfolio Cost: ${formatPercent(costPct)}`)
    }
    if (annualCost > 0) {
      costItems.push(`Annual Cost: ${toLakhs(annualCost)}`)
    }

    const directPct = summary.cost?.direct_pct ?? 0
    const regularPct = summary.cost?.regular_pct ?? 0
    if (directPct > 0 || regularPct > 0) {
      costItems.push(
        `Direct: ${formatPercent(directPct)}, Regular: ${formatPercent(regularPct)}`
      )
    }

    const totalGains = summary.total_gain_loss ?? 0
    if (totalGains > 0) {
      costItems.push(`Total Gains: ${toLakhs(totalGains)}`)
    }

    if (costItems.length > 0) {
      obs.push({
        category: "cost",
        icon: <DollarSign className="w-5 h-5 text-primary" />,
        title: "Cost & Returns",
        items: costItems,
      })
    }

    // Allocation Highlights
    const allocationItems: string[] = []
    const guidelines = summary.guidelines
    if (guidelines?.investment_guidelines) {
      const assetAlloc = guidelines.investment_guidelines.asset_allocation
      assetAlloc.forEach((item) => {
        const gap = item.current - item.recommended
        if (Math.abs(gap) > 1) {
          allocationItems.push(
            `${item.label}: ${formatPercent(item.current)} (Target: ${formatPercent(item.recommended)}, Gap: ${gap > 0 ? "+" : ""}${formatPercent(gap)})`
          )
        } else {
          allocationItems.push(
            `${item.label}: ${formatPercent(item.current)} (Target: ${formatPercent(item.recommended)})`
          )
        }
      })
    } else {
      summary.asset_allocation?.forEach((alloc) => {
        allocationItems.push(
          `${alloc.category}: ${formatPercent(alloc.allocation_pct)}`
        )
      })
    }

    if (allocationItems.length > 0) {
      obs.push({
        category: "allocation",
        icon: <AlertTriangle className="w-5 h-5 text-primary" />,
        title: "Allocation Status",
        items: allocationItems,
      })
    }

    return obs
  }, [summary])

  if (observations.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
      {observations.map((obs, idx) => (
        <WideCard key={idx}>
          <div className="relative">
            <div className="absolute top-0 right-0">
              <SectionInfoTooltip
                title={obs.title}
                formula={
                  <>
                    All values are calculated from portfolio data:<br />
                    {obs.category === "performance" && "Performance metrics from XIRR and returns"}
                    {obs.category === "risk" && "Risk metrics from allocation and concentration"}
                    {obs.category === "cost" && "Cost metrics from TER and fund types"}
                    {obs.category === "allocation" && "Allocation gaps = Current % − Target %"}
                  </>
                }
                content={
                  <>
                    Key observations for {obs.title.toLowerCase()}.
                  </>
                }
              />
            </div>
            <div className="flex items-center gap-2 mb-4">
              {obs.icon}
              <h4 className="font-semibold text-base text-foreground">
                {obs.title}
              </h4>
            </div>
            <ul className="space-y-2">
              {obs.items.map((item, itemIdx) => (
                <li
                  key={itemIdx}
                  className="text-sm text-foreground flex items-start gap-2"
                >
                  <span className="text-muted-foreground mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </WideCard>
      ))}
    </div>
  )
}

export const KeyObservations = memo(KeyObservationsInner)
