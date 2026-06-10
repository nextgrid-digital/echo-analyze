import { classifyAllocationCategory } from "@/lib/portfolioAnalysis"
import type {
  AnalysisSummary,
  AssetAllocation as AssetAlloc,
  Holding,
} from "@/types/api"

export interface OtherFundItem {
  scheme_name: string
  sub_category: string
  value: number
  allocation_pct: number
}

export interface AssetAllocationData {
  tableData: AssetAlloc[]
  othersBreakdown: AssetAlloc[]
  otherFunds: OtherFundItem[]
}

export function buildAssetAllocationData(
  summary: AnalysisSummary,
  holdings: Holding[]
): AssetAllocationData {
  const alloc: AssetAlloc[] = summary.asset_allocation ?? []
  let equity = 0
  let liquidity = 0
  let marketDebt = 0
  let others = 0
  const rawOthersBreakdown: AssetAlloc[] = []

  alloc.forEach((item) => {
    const value = item.value ?? 0
    const category = item.category ?? ""

    switch (classifyAllocationCategory(category)) {
      case "liquidity":
        liquidity += value
        break
      case "market_debt":
        marketDebt += value
        break
      case "equity":
        equity += value
        break
      default:
        others += value
        rawOthersBreakdown.push(item)
        break
    }
  })

  const total = equity + liquidity + marketDebt + others || 1
  const groupedTableData: AssetAlloc[] = []

  if (equity > 0) {
    groupedTableData.push({
      category: "Equity",
      value: equity,
      allocation_pct: parseFloat(((equity / total) * 100).toFixed(1)),
    })
  }

  if (marketDebt > 0) {
    groupedTableData.push({
      category: "Debt - Market",
      value: marketDebt,
      allocation_pct: parseFloat(((marketDebt / total) * 100).toFixed(1)),
    })
  }

  if (liquidity > 0) {
    groupedTableData.push({
      category: "Liquidity",
      value: liquidity,
      allocation_pct: parseFloat(((liquidity / total) * 100).toFixed(1)),
    })
  }

  if (others > 0) {
    groupedTableData.push({
      category: "Others",
      value: others,
      allocation_pct: parseFloat(((others / total) * 100).toFixed(1)),
    })
  }

  const othersBreakdown = rawOthersBreakdown
    .map((item) => ({
      category: item.category,
      value: item.value,
      allocation_pct: parseFloat(((item.value / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.value - a.value)

  const otherFundMap = new Map<
    string,
    { scheme_name: string; sub_category: string; value: number }
  >()

  holdings.forEach((holding) => {
    const subCategory =
      holding.sub_category || holding.category || "Uncategorized"
    const groupedAsOthers =
      classifyAllocationCategory(subCategory) === "others" ||
      (holding.category ?? "").toUpperCase() === "OTHERS"

    if (!groupedAsOthers) return

    const key = `${holding.scheme_name}__${subCategory}`
    const existing = otherFundMap.get(key)
    if (existing) {
      existing.value += holding.market_value || 0
    } else {
      otherFundMap.set(key, {
        scheme_name: holding.scheme_name,
        sub_category: subCategory,
        value: holding.market_value || 0,
      })
    }
  })

  const otherFunds: OtherFundItem[] = Array.from(otherFundMap.values())
    .sort((a, b) => b.value - a.value)
    .map((item) => ({
      ...item,
      allocation_pct: parseFloat(((item.value / total) * 100).toFixed(1)),
    }))

  return {
    tableData: groupedTableData,
    othersBreakdown,
    otherFunds,
  }
}
