import type { AnalysisSummary, Holding } from "@/types/api"

export function createEmptySummary(): AnalysisSummary {
  return {
    total_market_value: 0,
    total_cost_value: 0,
    total_gain_loss: 0,
    portfolio_return: 0,
    portfolio_xirr: 0,
    benchmark_xirr: 0,
    benchmark_gains: 0,
    holdings_count: 0,
    statement_date: null,
    asset_allocation: [],
    concentration: {
      fund_count: 0,
      recommended_funds: "7-10",
      fund_status: "No data",
      amc_count: 0,
      recommended_amcs: "5-7",
      amc_status: "No data",
      top_funds: [],
      top_amcs: [],
    },
    cost: {
      direct_pct: 0,
      regular_pct: 0,
      portfolio_cost_pct: 0,
      annual_cost: 0,
      total_cost_paid: 0,
      savings_value: 0,
    },
    market_cap: {
      large_cap: 0,
      mid_cap: 0,
      small_cap: 0,
    },
    equity_value: 0,
    equity_pct: 0,
    fixed_income: {
      invested_value: 0,
      current_value: 0,
      irr: 0,
      ytm: 0,
      credit_quality: { aaa_pct: 0, aa_pct: 0, below_aa_pct: 0 },
      top_funds: [],
      top_amcs: [],
      category_allocation: [],
    },
    performance_summary: {
      one_year: { underperforming_pct: 0, upto_3_pct: 0, more_than_3_pct: 0 },
      three_year: { underperforming_pct: 0, upto_3_pct: 0, more_than_3_pct: 0 },
    },
    guidelines: null,
    overlap: {
      fund_codes: [],
      fund_names: [],
      matrix: [],
    },
    investor_info: null,
  }
}

export function createEmptyHoldings(): Holding[] {
  return []
}
