import type { Holding } from "@/types/api"

export type FundPerformanceStatus = "outperforming" | "underperforming" | "neutral" | "unknown"

export interface FundNewsItem {
  id: string
  title: string
  summary: string
  source: string
  publishedAt: string
}

export function getFundWeightPct(holding: Holding, totalMarketValue: number): number {
  if (!totalMarketValue) return 0
  return (holding.market_value / totalMarketValue) * 100
}

export function getGainLoss(holding: Holding): number {
  if (holding.gain_loss !== undefined && holding.gain_loss !== null) {
    return holding.gain_loss
  }
  return holding.market_value - (holding.cost_value || 0)
}

export function getXirrDelta(holding: Holding): number | null {
  if (holding.xirr == null || holding.benchmark_xirr == null) return null
  return holding.xirr - holding.benchmark_xirr
}

export function getPerformanceStatus(holding: Holding): FundPerformanceStatus {
  const delta = getXirrDelta(holding)
  if (delta === null) return "unknown"
  if (Math.abs(delta) < 0.05) return "neutral"
  return delta > 0 ? "outperforming" : "underperforming"
}

export function buildIllustrativeNews(holding: Holding): FundNewsItem[] {
  const family = holding.fund_family?.trim() || "Fund house"
  const category = holding.category?.trim() || "Mutual fund"
  const subCategory = holding.sub_category?.trim() || "core allocation"
  const today = new Date().toISOString().slice(0, 10)

  return [
    {
      id: "sector-outlook",
      title: `${subCategory} funds see steady inflows amid allocation review`,
      summary: `Advisors are revisiting ${subCategory.toLowerCase()} sleeves as part of broader ${category.toLowerCase()} portfolio reviews.`,
      source: "Market context",
      publishedAt: today,
    },
    {
      id: "house-update",
      title: `${family} highlights disciplined portfolio construction`,
      summary: `Recent commentary from ${family} emphasizes risk management and benchmark-aware positioning across active strategies.`,
      source: "AMC commentary",
      publishedAt: today,
    },
    {
      id: "regulatory",
      title: "SEBI norms continue to shape advisor due-diligence workflows",
      summary: "Wealth managers are aligning client reviews with updated disclosure and suitability expectations for mutual fund recommendations.",
      source: "Regulatory brief",
      publishedAt: today,
    },
    {
      id: "benchmark",
      title: `Benchmark comparison remains central for ${subCategory} holdings`,
      summary: holding.benchmark_name
        ? `Peer discussions are focused on sustained performance versus ${holding.benchmark_name}.`
        : "Peer discussions are focused on sustained performance versus category benchmarks.",
      source: "Advisor desk",
      publishedAt: today,
    },
  ]
}
