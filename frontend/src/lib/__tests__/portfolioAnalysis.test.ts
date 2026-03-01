import { createEmptySummary } from "@/lib/emptyData"
import {
  getDashboardMethodologyWarnings,
  getNormalizedEquityAllocationPct,
} from "../portfolioAnalysis"
import type { Holding } from "@/types/api"

describe("portfolioAnalysis", () => {
  it("derives equity allocation from the rendered asset-allocation buckets", () => {
    const summary = createEmptySummary()
    summary.equity_pct = 100
    summary.asset_allocation = [
      { category: "Equity", value: 500000, allocation_pct: 50 },
      { category: "Debt - Market", value: 350000, allocation_pct: 35 },
      { category: "Liquidity", value: 150000, allocation_pct: 15 },
    ]

    expect(getNormalizedEquityAllocationPct(summary)).toBe(50)
  })

  it("builds benchmark methodology notices for the header rail", () => {
    const summary = createEmptySummary()
    summary.total_market_value = 200000
    summary.guidelines = {
      investment_guidelines: {
        asset_allocation: [
          { label: "Equity", current: 50, recommended: 80 },
          { label: "Fixed Income", current: 50, recommended: 20 },
        ],
        equity_mc: [],
        fi_metrics: [],
      },
      equity_indicative: [],
      fi_indicative: [],
    }

    const holdings: Holding[] = [
      {
        fund_family: "AMC A",
        folio: "1",
        scheme_name: "Benchmarked Fund",
        units: 10,
        nav: 100,
        market_value: 100000,
        cost_value: 80000,
        category: "Equity",
        sub_category: "Flexi Cap",
        missed_gains: 5000,
        date_of_entry: "2024-01-01",
      },
      {
        fund_family: "AMC B",
        folio: "2",
        scheme_name: "Unbenchmarked Fund",
        units: 10,
        nav: 100,
        market_value: 100000,
        cost_value: 80000,
        category: "Equity",
        sub_category: "Sectoral",
        missed_gains: null,
        date_of_entry: "2024-01-01",
      },
    ]

    const warnings = getDashboardMethodologyWarnings(summary, holdings)

    expect(warnings.map((item) => item.code)).toEqual([
      "BENCHMARK_RECONSTRUCTED_SERIES_UI",
      "BENCHMARK_CHART_COVERAGE_UI",
      "GUIDELINES_TEMPLATE_UI",
    ])
    expect(warnings[1]?.message).toBe(
      "Chart coverage: 50.0% of current portfolio value has comparable benchmark data. 1 holding(s) without benchmark data are excluded."
    )
  })
})
