import { clearLatestAnalysis, loadLatestAnalysis, storeLatestAnalysis } from "@/lib/analysisSession"
import type { AnalysisResponse } from "@/types/api"

const sampleResult: AnalysisResponse = {
  success: true,
  holdings: [],
  summary: {
    total_market_value: 1000,
    total_cost_value: 900,
    total_gain_loss: 100,
    portfolio_return: 11.1,
    portfolio_xirr: 10,
    benchmark_xirr: 8,
    benchmark_gains: 80,
    holdings_count: 0,
    asset_allocation: [],
    concentration: {
      fund_count: 0,
      fund_status: "Healthy",
      amc_count: 0,
      amc_status: "Healthy",
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
    statement_market_value: 1000,
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
      equity_ltcg_rate_pct: 12.5,
      equity_ltcg_exemption: 125000,
    },
    warnings: [],
    data_coverage: {
      benchmark_date_match_pct: 100,
      overlap_source: "none",
      overlap_available_funds: 0,
    },
  },
}

describe("analysisSession", () => {
  beforeEach(() => {
    clearLatestAnalysis()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it("restores the last analysis for the same signed-in user", () => {
    storeLatestAnalysis(sampleResult, "user_test")

    expect(loadLatestAnalysis("user_test")).toEqual(sampleResult)
  })

  it("keeps analysis data out of browser storage", () => {
    storeLatestAnalysis(sampleResult, "user_test")

    expect(window.sessionStorage.length).toBe(0)
    expect(window.localStorage.length).toBe(0)
  })

  it("does not restore another user's cached analysis", () => {
    storeLatestAnalysis(sampleResult, "user_a")

    expect(loadLatestAnalysis("user_b")).toBeNull()
    expect(loadLatestAnalysis("user_a")).toBeNull()
  })
})
