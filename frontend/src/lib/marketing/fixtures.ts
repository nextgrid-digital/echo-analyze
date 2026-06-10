import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import type { AdvisorBookClient } from "@/lib/opportunities/types"
import type { AnalysisResponse } from "@/types/api"

const now = "2026-06-01T10:00:00.000Z"

function client(
  pan: string,
  name: string,
  totalMarketValue: number,
  portfolioXirr: number
): AdvisorBookClient {
  const analysis: AnalysisResponse = {
    ...SAMPLE_ANALYSIS,
    summary: {
      ...SAMPLE_ANALYSIS.summary!,
      investor_info: {
        ...SAMPLE_ANALYSIS.summary!.investor_info,
        name,
        pan,
      },
      total_market_value: totalMarketValue,
      portfolio_xirr: portfolioXirr,
    },
  }

  return {
    pan,
    name,
    email: null,
    phone: null,
    analysis,
    updatedAt: now,
  }
}

export const MOCK_BOOK_CLIENTS: AdvisorBookClient[] = [
  client("ABCDE1234F", "Priya Sharma", 4_280_000, 14.2),
  client("FGHIJ5678K", "Rahul Mehta", 12_500_000, 11.8),
  client("LMNOP9012Q", "Anita Desai", 8_100_000, 13.5),
  client("RSTUV3456W", "Vikram Patel", 21_300_000, 10.2),
]

export const MARKETING_ANALYSIS = SAMPLE_ANALYSIS
