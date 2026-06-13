import { getNormalizedEquityAllocationPct } from "@/lib/portfolioAnalysis"
import type { AnalysisSummary, Holding, InvestmentEvent } from "@/types/api"
import type { PortfolioHealthStatus } from "@/types/review"

export function computePortfolioHealthStatus(summary: AnalysisSummary): PortfolioHealthStatus {
  const underperformingPct = summary.performance_summary?.one_year.underperforming_pct ?? 0
  const fundCount = summary.concentration?.fund_count ?? 0
  const equityPct = getNormalizedEquityAllocationPct(summary)
  const targetEquity =
    summary.guidelines?.investment_guidelines?.asset_allocation.find((a) => a.label === "Equity")
      ?.recommended ?? 80
  const equityGap = Math.abs(equityPct - targetEquity)
  const portfolioXirr = summary.portfolio_xirr
  const benchmarkXirr = summary.benchmark_xirr
  const xirrDelta =
    portfolioXirr != null && benchmarkXirr != null ? portfolioXirr - benchmarkXirr : null

  let score = 0
  if (underperformingPct > 25) score += 2
  else if (underperformingPct > 10) score += 1
  if (fundCount > 20) score += 2
  else if (fundCount > 15) score += 1
  if (equityGap > 15) score += 2
  else if (equityGap > 8) score += 1
  if (xirrDelta != null && xirrDelta < -3) score += 2
  else if (xirrDelta != null && xirrDelta < 0) score += 1

  if (score >= 4) return "needs_attention"
  if (score >= 2) return "good"
  return "excellent"
}

export function buildWealthJourney(
  events: InvestmentEvent[],
  currentValue: number,
  statementDate?: string | null,
) {
  if (events.length === 0) {
    return { mode: "limited" as const, points: [], milestones: [] }
  }

  let cumulativeInvested = 0
  const points: Array<{
    date: string
    invested?: number
    portfolio_value?: number
    event_type: string
    amount?: number
  }> = []

  for (const event of events) {
    if (event.type === "purchase" || event.type === "sip") {
      cumulativeInvested += event.amount
    } else if (event.type === "redemption") {
      cumulativeInvested = Math.max(0, cumulativeInvested - event.amount)
    }
    points.push({
      date: event.date,
      invested: Math.round(cumulativeInvested * 100) / 100,
      event_type: event.type,
      amount: event.amount,
    })
  }

  if (statementDate) {
    points.push({
      date: statementDate,
      invested: Math.round(cumulativeInvested * 100) / 100,
      portfolio_value: Math.round(currentValue * 100) / 100,
      event_type: "current",
      amount: currentValue,
    })
  }

  const milestones: Array<{ label: string; date?: string; value?: number }> = []
  const firstSip = events.find((event) => event.type === "sip")
  if (firstSip) {
    milestones.push({ label: "First SIP recorded", date: firstSip.date })
  }
  if (currentValue >= 10_000_000) milestones.push({ label: "₹1 Cr portfolio milestone", value: 10_000_000 })
  else if (currentValue >= 5_000_000) milestones.push({ label: "₹50 L portfolio milestone", value: 5_000_000 })
  else if (currentValue >= 1_000_000) milestones.push({ label: "₹10 L invested", value: 1_000_000 })

  return {
    mode: "transactions" as const,
    points: points.slice(-120),
    milestones,
  }
}

export function buildWealthJourneyFromHoldings(holdings: Holding[], currentValue: number, statementDate?: string | null) {
  const entryDates = holdings
    .map((holding) => holding.date_of_entry)
    .filter((date): date is string => Boolean(date))
    .sort()

  if (entryDates.length === 0) {
    return { mode: "limited" as const, points: [], milestones: [] }
  }

  const points = entryDates.map((date, index) => ({
    date,
    invested: Math.round((currentValue * (index + 1)) / entryDates.length),
    event_type: "entry",
  }))

  if (statementDate) {
    points.push({
      date: statementDate,
      invested: currentValue,
      event_type: "current",
    })
  }

  return {
    mode: "limited" as const,
    points,
    milestones: [{ label: "Holdings snapshot available", date: statementDate ?? entryDates[0] }],
  }
}
