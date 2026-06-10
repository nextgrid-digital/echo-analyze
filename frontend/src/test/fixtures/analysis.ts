import { createEmptySummary } from "@/lib/emptyData"
import type { AnalysisResponse } from "@/types/api"

export const SAMPLE_ANALYSIS: AnalysisResponse = {
  success: true,
  summary: {
    ...createEmptySummary(),
    investor_info: {
      name: "Priya Sharma",
      pan: "ABCDE1234F",
      email: "priya@example.com",
      phone: "9876543210",
    },
    statement_date: "31-Mar-2026",
    total_market_value: 4_280_000,
    total_cost_value: 3_900_000,
    portfolio_return: 9.7,
    portfolio_xirr: 14.2,
    equity_pct: 68,
    performance_summary: {
      one_year: {
        comparable_pct: 82,
        underperforming_pct: 18,
        upto_3_pct: 12,
        more_than_3_pct: 6,
      },
      three_year: {
        comparable_pct: 90,
        underperforming_pct: 10,
        upto_3_pct: 7,
        more_than_3_pct: 3,
      },
    },
    concentration: {
      fund_count: 8,
      recommended_funds: "7-10",
      fund_status: "Moderate",
      amc_count: 4,
      recommended_amcs: "5-7",
      amc_status: "Good",
      top_funds: [],
      top_amcs: [],
    },
  },
  holdings: [
    {
      fund_family: "HDFC Mutual Fund",
      folio: "12345/67",
      scheme_name: "HDFC Flexi Cap Fund - Direct Growth",
      amfi: "100033",
      units: 1250.45,
      nav: 1245.8,
      market_value: 1_558_000,
      cost_value: 1_320_000,
      category: "Equity",
      sub_category: "Flexi Cap",
      gain_loss: 238_000,
      return_pct: 18.03,
      xirr: 15.2,
      benchmark_xirr: 12.8,
      benchmark_name: "Nifty 500 TRI",
      missed_gains: -12000,
      date_of_entry: "2019-06-15",
      style_category: "Large Cap",
    },
  ],
}
