import type { AnalysisSummary, AnalysisWarning, Holding } from "@/types/api"

export type AllocationGroupKey = "equity" | "market_debt" | "liquidity" | "others"

export interface BenchmarkCoverageMeta {
  comparableCoveragePct: number
  excludedHoldings: number
  hasComparableSeries: boolean
}

export const BENCHMARK_RECONSTRUCTED_NOTICE =
  "Reconstructed comparison path using each holding's entry date, invested value, and current value. This is an illustrative benchmark comparison, not a transaction-level valuation history."

export function classifyAllocationCategory(rawCategory: string): AllocationGroupKey {
  const category = (rawCategory ?? "").toUpperCase()
  if (
    category.includes("LIQUID") ||
    category.includes("OVERNIGHT") ||
    category.includes("MONEY MARKET")
  ) {
    return "liquidity"
  }

  if (category.includes("DEBT") || category.includes("FIXED INCOME")) {
    return "market_debt"
  }

  if (
    category.includes("EQUITY") ||
    category.includes("CAP") ||
    category.includes("ELSS")
  ) {
    return "equity"
  }

  return "others"
}

export function getNormalizedEquityAllocationPct(summary: Pick<AnalysisSummary, "asset_allocation" | "equity_pct">): number {
  const assetAllocation = summary.asset_allocation ?? []
  const groupedValues = assetAllocation.reduce(
    (acc, item) => {
      const value = Number.isFinite(item.value) ? item.value : 0
      acc[classifyAllocationCategory(item.category ?? "")] += value
      return acc
    },
    {
      equity: 0,
      market_debt: 0,
      liquidity: 0,
      others: 0,
    } satisfies Record<AllocationGroupKey, number>,
  )

  const total =
    groupedValues.equity +
    groupedValues.market_debt +
    groupedValues.liquidity +
    groupedValues.others

  if (total > 0) {
    return Number(((groupedValues.equity / total) * 100).toFixed(1))
  }

  const fallback = Number(summary.equity_pct)
  return Number.isFinite(fallback) ? fallback : 0
}

export function getBenchmarkCoverageMeta(holdings: Holding[]): BenchmarkCoverageMeta {
  const totalPortfolioValue = holdings.reduce(
    (sum, holding) => sum + (Number.isFinite(holding.market_value) ? holding.market_value : 0),
    0,
  )

  let comparableCurrentValue = 0
  let excludedHoldings = 0

  for (const holding of holdings) {
    const portfolioTerminal = Number.isFinite(holding.market_value) ? holding.market_value : 0
    if (portfolioTerminal <= 0) continue

    const benchmarkTerminal =
      holding.missed_gains !== null && holding.missed_gains !== undefined
        ? portfolioTerminal + holding.missed_gains
        : null

    if (
      benchmarkTerminal === null ||
      !Number.isFinite(benchmarkTerminal) ||
      benchmarkTerminal <= 0
    ) {
      excludedHoldings += 1
      continue
    }

    comparableCurrentValue += portfolioTerminal
  }

  return {
    comparableCoveragePct:
      totalPortfolioValue > 0 ? Math.min(100, (comparableCurrentValue / totalPortfolioValue) * 100) : 0,
    excludedHoldings,
    hasComparableSeries: comparableCurrentValue > 0,
  }
}

export function formatBenchmarkCoverageNotice(seriesMeta: BenchmarkCoverageMeta): string {
  const excludedText =
    seriesMeta.excludedHoldings > 0
      ? ` ${seriesMeta.excludedHoldings} holding(s) without benchmark data are excluded.`
      : ""

  return `Chart coverage: ${seriesMeta.comparableCoveragePct.toFixed(1)}% of current portfolio value has comparable benchmark data.${excludedText}`
}

export function getDashboardMethodologyWarnings(
  summary: Pick<AnalysisSummary, "guidelines" | "total_market_value">,
  holdings: Holding[],
): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = []

  if ((summary.total_market_value ?? 0) > 0 || holdings.length > 0) {
    warnings.push({
      code: "BENCHMARK_RECONSTRUCTED_SERIES_UI",
      section: "benchmark",
      severity: "info",
      message: BENCHMARK_RECONSTRUCTED_NOTICE,
    })
  }

  const coverage = getBenchmarkCoverageMeta(holdings)
  if (coverage.hasComparableSeries && coverage.comparableCoveragePct < 99.5) {
    warnings.push({
      code: "BENCHMARK_CHART_COVERAGE_UI",
      section: "benchmark",
      severity: "info",
      message: formatBenchmarkCoverageNotice(coverage),
    })
  }

  if (summary.guidelines?.investment_guidelines) {
    warnings.push({
      code: "GUIDELINES_TEMPLATE_UI",
      section: "guidelines",
      severity: "info",
      message:
        "Template guidance: target allocations are model recommendations and should be treated as advisory, not prescriptive.",
    })
  }

  return warnings
}
