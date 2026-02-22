import type { AnalysisSummary, Holding } from "@/types/api"

export function createEmptySummary(): AnalysisSummary {
  return {
    total_market_value: 0,
    total_cost_value: 0,
    total_gain_loss: 0,
    portfolio_return: 0,
    portfolio_xirr: null,
    benchmark_xirr: null,
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
    valuation_mode: "live_nav",
    statement_market_value: 0,
    live_nav_delta_value: 0,
    equity_cost_value: 0,
    equity_gain_loss: 0,
    fixed_income_cost_value: 0,
    fixed_income_gain_loss: 0,
    tax: {
      short_term_gains: 0,
      long_term_gains: 0,
      tax_free_gains: 0,
      taxable_gains: 0,
      estimated_tax_liability: 0,
      equity_stcg_rate_pct: 20,
      equity_ltcg_rate_pct: 12,
      equity_ltcg_exemption: 125000,
    },
    warnings: [],
    data_coverage: {
      benchmark_date_match_pct: 100,
      overlap_source: "none",
      overlap_available_funds: 0,
    },
    fixed_income: {
      invested_value: 0,
      current_value: 0,
      irr: null,
      ytm: null,
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
