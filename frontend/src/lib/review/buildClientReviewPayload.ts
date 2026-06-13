import { computePortfolioHealthStatus, buildWealthJourney, buildWealthJourneyFromHoldings } from "@/lib/review/healthScore"
import type { AnalysisResponse } from "@/types/api"
import type { ClientReviewPayload } from "@/types/review"

function defaultNextReviewDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 6)
  return date.toISOString().slice(0, 10)
}

export function buildClientReviewPayload(
  analysis: AnalysisResponse,
  advisorName: string,
  options?: {
    whatsWorkingWell?: string[]
    areasToDiscuss?: string[]
    nextReviewDate?: string
  },
): ClientReviewPayload {
  const summary = analysis.summary
  if (!summary) {
    throw new Error("Analysis summary is required.")
  }

  const events = analysis.investment_events ?? []
  const currentValue = summary.total_market_value
  const wealthJourney =
    events.length > 0
      ? buildWealthJourney(events, currentValue, summary.statement_date)
      : buildWealthJourneyFromHoldings(analysis.holdings, currentValue, summary.statement_date)

  return {
    client_name: summary.investor_info?.name?.trim() || "Client",
    advisor_name: advisorName,
    statement_date: summary.statement_date,
    generated_at: new Date().toISOString(),
    overview: {
      current_value: summary.total_market_value,
      invested_value: summary.total_cost_value,
      gain_loss: summary.total_gain_loss,
      portfolio_return: summary.portfolio_return,
      portfolio_xirr: summary.portfolio_xirr ?? null,
      benchmark_xirr: summary.benchmark_xirr ?? null,
      benchmark_label: "Benchmark",
    },
    health_status: computePortfolioHealthStatus(summary),
    wealth_journey: wealthJourney,
    asset_allocation: (summary.asset_allocation ?? []).map((item) => ({
      category: item.category,
      allocation_pct: item.allocation_pct,
    })),
    whats_working_well: options?.whatsWorkingWell ?? [],
    areas_to_discuss: options?.areasToDiscuss ?? [],
    next_review_date: options?.nextReviewDate ?? defaultNextReviewDate(),
  }
}

export function isClientSafePayload(payload: ClientReviewPayload): boolean {
  const serialized = JSON.stringify(payload).toLowerCase()
  const forbidden = ["overlap", "sharpe", "beta", "amc_count", "fund_overlap", "advisor_notes"]
  return !forbidden.some((term) => serialized.includes(term))
}
