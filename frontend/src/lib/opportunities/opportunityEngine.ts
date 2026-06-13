import { getNormalizedEquityAllocationPct } from "@/lib/portfolioAnalysis"
import type { AdvisorBookClient } from "@/lib/opportunities/types"
import type { Opportunity, OpportunityPriority, OpportunityType } from "@/types/review"

const OPPORTUNITY_LABELS: Record<OpportunityType, string> = {
  sip_increase: "SIP Increase Opportunity",
  portfolio_consolidation: "Portfolio Consolidation",
  amc_concentration: "AMC Concentration",
  underperforming_holdings: "Underperforming Holdings Review",
  equity_allocation: "Equity Allocation Review",
  debt_allocation: "Debt Allocation Review",
  idle_cash: "Idle Cash Deployment",
  tax_planning: "Tax Planning Discussion",
}

export function getOpportunityLabel(type: OpportunityType): string {
  return OPPORTUNITY_LABELS[type]
}

function topAmcConcentrationPct(client: AdvisorBookClient): number {
  const amcTotals = new Map<string, number>()
  let total = 0
  for (const holding of client.analysis.holdings) {
    const amc = holding.fund_family?.trim() || "Unknown"
    const value = holding.market_value ?? 0
    total += value
    amcTotals.set(amc, (amcTotals.get(amc) ?? 0) + value)
  }
  if (total <= 0) return 0
  const top = Math.max(...amcTotals.values())
  return (top / total) * 100
}

function debtAllocationPct(summary: NonNullable<AdvisorBookClient["analysis"]["summary"]>): number {
  const debt = summary.asset_allocation.find((item) =>
    item.category.toLowerCase().includes("debt") || item.category.toLowerCase().includes("fixed"),
  )
  return debt?.allocation_pct ?? 0
}

export function detectClientOpportunities(client: AdvisorBookClient): Opportunity[] {
  const summary = client.analysis.summary
  if (!summary) return []

  const opportunities: Opportunity[] = []
  const aum = summary.total_market_value
  const events = client.analysis.investment_events ?? []
  const sipEvents = events.filter((event) => event.type === "sip")
  const underperformingPct = summary.performance_summary?.one_year.underperforming_pct ?? 0
  const fundCount = summary.concentration?.fund_count ?? 0
  const equityPct = getNormalizedEquityAllocationPct(summary)
  const targetEquity =
    summary.guidelines?.investment_guidelines?.asset_allocation.find((item) => item.label === "Equity")
      ?.recommended ?? 80
  const debtPct = debtAllocationPct(summary)
  const targetDebt =
    summary.guidelines?.investment_guidelines?.asset_allocation.find(
      (item) => item.label === "Debt" || item.label === "Fixed Income",
    )?.recommended ?? 20
  const amcPct = topAmcConcentrationPct(client)
  const taxStcg = summary.tax?.short_term_gains ?? 0
  const taxLtcg = summary.tax?.long_term_gains ?? 0

  if (sipEvents.length >= 2 && aum > 500_000) {
    opportunities.push({
      clientPan: client.pan,
      clientName: client.name,
      type: "sip_increase",
      potentialAmount: Math.round(aum * 0.05),
      priority: "medium",
      reason: "Regular SIP activity with meaningful portfolio base.",
      suggestedAction: "Discuss incremental SIP capacity in the next review.",
    })
  }

  if (fundCount > 15) {
    opportunities.push({
      clientPan: client.pan,
      clientName: client.name,
      type: "portfolio_consolidation",
      potentialAmount: Math.round(aum * 0.1),
      priority: fundCount > 20 ? "high" : "medium",
      reason: `${fundCount} funds may add complexity and overlap risk.`,
      suggestedAction: "Review consolidation opportunities across categories.",
    })
  }

  if (amcPct >= 45) {
    opportunities.push({
      clientPan: client.pan,
      clientName: client.name,
      type: "amc_concentration",
      potentialAmount: Math.round(aum * (amcPct / 100)),
      priority: amcPct >= 60 ? "high" : "medium",
      reason: `Top AMC represents ${amcPct.toFixed(0)}% of portfolio value.`,
      suggestedAction: "Discuss diversification across asset managers.",
    })
  }

  if (underperformingPct >= 15) {
    opportunities.push({
      clientPan: client.pan,
      clientName: client.name,
      type: "underperforming_holdings",
      potentialAmount: Math.round(aum * (underperformingPct / 100)),
      priority: underperformingPct >= 30 ? "high" : "medium",
      reason: `${underperformingPct.toFixed(0)}% of holdings trail benchmark (1Y).`,
      suggestedAction: "Schedule a performance review conversation.",
    })
  }

  if (Math.abs(equityPct - targetEquity) >= 8) {
    opportunities.push({
      clientPan: client.pan,
      clientName: client.name,
      type: "equity_allocation",
      potentialAmount: Math.round(aum * (Math.abs(equityPct - targetEquity) / 100)),
      priority: Math.abs(equityPct - targetEquity) >= 15 ? "high" : "medium",
      reason: `Equity allocation is ${equityPct.toFixed(0)}% vs ${targetEquity}% target.`,
      suggestedAction: "Review strategic asset allocation alignment.",
    })
  }

  if (Math.abs(debtPct - targetDebt) >= 8) {
    opportunities.push({
      clientPan: client.pan,
      clientName: client.name,
      type: "debt_allocation",
      potentialAmount: Math.round(aum * (Math.abs(debtPct - targetDebt) / 100)),
      priority: "medium",
      reason: `Debt allocation is ${debtPct.toFixed(0)}% vs ${targetDebt}% target.`,
      suggestedAction: "Discuss fixed income positioning.",
    })
  }

  if (equityPct < 40 && aum > 1_000_000) {
    opportunities.push({
      clientPan: client.pan,
      clientName: client.name,
      type: "idle_cash",
      potentialAmount: Math.round(aum * 0.15),
      priority: "low",
      reason: "Portfolio appears under-allocated to growth assets.",
      suggestedAction: "Explore deployment options aligned to goals.",
    })
  }

  if (taxStcg > 50_000 || taxLtcg > 100_000) {
    opportunities.push({
      clientPan: client.pan,
      clientName: client.name,
      type: "tax_planning",
      potentialAmount: Math.round(taxStcg + taxLtcg),
      priority: taxStcg > 200_000 ? "high" : "medium",
      reason: "Estimated capital gains may benefit from tax planning discussion.",
      suggestedAction: "Review tax implications before year-end actions.",
    })
  }

  return opportunities
}

export function detectBookOpportunities(clients: AdvisorBookClient[]): Opportunity[] {
  return clients.flatMap((client) => detectClientOpportunities(client))
}

export function aggregateOpportunityValue(opportunities: Opportunity[]): number {
  return opportunities.reduce((sum, item) => sum + item.potentialAmount, 0)
}

export function countByPriority(opportunities: Opportunity[], priority: OpportunityPriority): number {
  return opportunities.filter((item) => item.priority === priority).length
}

export function sortOpportunities(opportunities: Opportunity[]): Opportunity[] {
  const priorityRank: Record<OpportunityPriority, number> = { high: 0, medium: 1, low: 2 }
  return [...opportunities].sort((left, right) => {
    const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority]
    if (priorityDelta !== 0) return priorityDelta
    return right.potentialAmount - left.potentialAmount
  })
}
