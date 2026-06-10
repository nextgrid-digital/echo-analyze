import { escapeCsvCell } from "@/lib/csv"
import { formatCurrency } from "@/lib/format"
import type { Holding } from "@/types/api"

export type HoldingsSortKey =
  | "folio"
  | "scheme_name"
  | "sub_category"
  | "style_category"
  | "benchmark"
  | "date_of_entry"
  | "holding_period"
  | "cost_value"
  | "market_value"
  | "weight_pct"
  | "missed_gains"
  | "xirr"
  | "benchmark_xirr"

export type HoldingsColumnId =
  | "rowNum"
  | "folio"
  | "scheme_name"
  | "sub_category"
  | "style_category"
  | "benchmark"
  | "date_of_entry"
  | "holding_period"
  | "cost_value"
  | "market_value"
  | "weight_pct"
  | "missed_gains"
  | "xirr"
  | "benchmark_xirr"

export interface HoldingsColumnDef {
  id: HoldingsColumnId
  key: HoldingsSortKey | null
  label: string
  align: "left" | "right"
  className?: string
}

export const COMPACT_COLUMN_IDS: HoldingsColumnId[] = [
  "scheme_name",
  "sub_category",
  "market_value",
  "weight_pct",
  "xirr",
  "missed_gains",
]

export const DETAIL_COLUMN_IDS: HoldingsColumnId[] = [
  "style_category",
  "cost_value",
  "benchmark",
  "date_of_entry",
  "holding_period",
  "benchmark_xirr",
]

const COLUMN_BY_ID = new Map<HoldingsColumnId, HoldingsColumnDef>()

export const HOLDINGS_COLUMNS: HoldingsColumnDef[] = [
  { id: "rowNum", key: null, label: "#", align: "right", className: "w-10" },
  { id: "folio", key: "folio", label: "Folio", align: "left", className: "min-w-[80px]" },
  {
    id: "scheme_name",
    key: "scheme_name",
    label: "Fund name",
    align: "left",
    className: "min-w-[160px] max-w-[240px]",
  },
  { id: "sub_category", key: "sub_category", label: "Sub-category", align: "left", className: "min-w-[96px]" },
  { id: "style_category", key: "style_category", label: "Style", align: "left", className: "min-w-[72px]" },
  { id: "benchmark", key: "benchmark", label: "Benchmark", align: "left", className: "min-w-[100px]" },
  { id: "date_of_entry", key: "date_of_entry", label: "Entry date", align: "left", className: "min-w-[88px]" },
  {
    id: "holding_period",
    key: "holding_period",
    label: "Holding period",
    align: "right",
    className: "min-w-[80px]",
  },
  { id: "cost_value", key: "cost_value", label: "Invested", align: "right", className: "min-w-[96px]" },
  { id: "market_value", key: "market_value", label: "Current value", align: "right", className: "min-w-[96px]" },
  { id: "weight_pct", key: "weight_pct", label: "Weight (%)", align: "right", className: "min-w-[72px]" },
  { id: "missed_gains", key: "missed_gains", label: "Missed gains", align: "right", className: "min-w-[96px]" },
  { id: "xirr", key: "xirr", label: "XIRR", align: "right", className: "min-w-[64px]" },
  { id: "benchmark_xirr", key: "benchmark_xirr", label: "BM XIRR", align: "right", className: "min-w-[72px]" },
]

for (const col of HOLDINGS_COLUMNS) {
  COLUMN_BY_ID.set(col.id, col)
}

export const CSV_COLUMN_ORDER: HoldingsColumnId[] = HOLDINGS_COLUMNS.map((col) => col.id)

export type HoldingsTableRow =
  | { type: "section"; label: string }
  | { type: "holding"; holding: Holding; key: string }
  | {
      type: "subtotal"
      label: string
      subtotal: number
      investedSubtotal: number
      missedGainsSubtotal: number
    }

export function getVisibleColumns(showDetails: boolean, showFolio: boolean): HoldingsColumnDef[] {
  const ids: HoldingsColumnId[] = [...COMPACT_COLUMN_IDS]
  if (showDetails) {
    ids.push(...DETAIL_COLUMN_IDS)
  }
  if (showFolio) {
    const schemeIndex = ids.indexOf("scheme_name")
    ids.splice(schemeIndex + 1, 0, "folio")
  }
  return ids.map((id) => COLUMN_BY_ID.get(id)).filter((col): col is HoldingsColumnDef => Boolean(col))
}

export function getFilterOptions(holdings: Holding[]) {
  const categories = Array.from(new Set(holdings.map((h) => h.category).filter(Boolean))).sort()
  const subCategories = Array.from(new Set(holdings.map((h) => h.sub_category).filter(Boolean))).sort()
  const styles = Array.from(
    new Set(holdings.map((h) => h.style_category).filter((s): s is string => Boolean(s)))
  ).sort()
  return { categories, subCategories, styles }
}

export function filterHoldingsByColumnFilters(
  holdings: Holding[],
  filters: { categories: string[]; subCategories: string[]; styles: string[] }
) {
  return holdings.filter((h) => {
    if (filters.categories.length > 0 && !filters.categories.includes(h.category)) {
      return false
    }
    if (filters.subCategories.length > 0 && !filters.subCategories.includes(h.sub_category)) {
      return false
    }
    if (filters.styles.length > 0 && !filters.styles.includes(h.style_category || "")) {
      return false
    }
    return true
  })
}

export function filterHoldingsBySearch(holdings: Holding[], searchQuery: string) {
  if (!searchQuery.trim()) return holdings
  const query = searchQuery.toLowerCase().trim()
  return holdings.filter(
    (h) =>
      h.scheme_name.toLowerCase().includes(query) ||
      h.sub_category.toLowerCase().includes(query) ||
      h.category.toLowerCase().includes(query) ||
      (h.style_category && h.style_category.toLowerCase().includes(query)) ||
      (h.folio || "").toLowerCase().includes(query)
  )
}

export function countActiveFilters(filters: {
  categories: string[]
  subCategories: string[]
  styles: string[]
  searchQuery: string
}) {
  let count = 0
  if (filters.categories.length > 0) count += 1
  if (filters.subCategories.length > 0) count += 1
  if (filters.styles.length > 0) count += 1
  if (filters.searchQuery.trim()) count += 1
  return count
}

const CATEGORY_BENCHMARK_FALLBACK: Record<string, string> = {
  Equity: "Nifty 500 Total Return Index",
  "Fixed Income": "CRISIL Liquid Fund Index",
  Gold: "Domestic Price of Gold",
  Hybrid: "CRISIL Hybrid 60+40 Index",
  Others: "Nifty 500 Total Return Index",
}

export function getBenchmarkName(holding: Holding): string {
  if (holding.benchmark_name?.trim()) {
    return holding.benchmark_name.trim()
  }
  return CATEGORY_BENCHMARK_FALLBACK[holding.category] ?? "Nifty 500 Total Return Index"
}

export function getYearsFromEntryDate(
  entryDate: string | null | undefined,
  nowMs: number
): number | null {
  if (!entryDate) return null
  const parsed = new Date(entryDate)
  if (Number.isNaN(parsed.getTime())) return null
  const elapsedMs = nowMs - parsed.getTime()
  if (elapsedMs < 0) return null
  return elapsedMs / (1000 * 60 * 60 * 24 * 365.25)
}

export function formatYearsFromEntryDate(
  entryDate: string | null | undefined,
  nowMs: number
): string | null {
  const years = getYearsFromEntryDate(entryDate, nowMs)
  if (years === null) return null
  return `${years.toFixed(1)} yrs`
}

export function calculateMissedGains(holding: Holding): number | null {
  const value = holding.missed_gains
  if (value === null || value === undefined) return null
  const n = Number(value)
  if (Number.isNaN(n)) return null
  return n
}

export function getDisplayedMissedGains(missedGains: number | null): number | null {
  return missedGains === null ? null : -missedGains
}

export function getMissedGainsColorClass(displayedMissedGains: number | null): string {
  if (displayedMissedGains === null) return "text-muted-foreground"
  if (displayedMissedGains < 0) return "text-red-500"
  if (displayedMissedGains > 0) return "text-green-500"
  return "text-foreground"
}

export function formatSignedCurrencyValue(value: number): string {
  const absValue = Math.abs(value)
  if (absValue <= 0.0001) return formatCurrency(0)
  return `${value > 0 ? "+" : "-"}${formatCurrency(absValue)}`
}

export function formatSignedRupees(value: number): string {
  const absValue = Math.abs(value)
  if (absValue <= 0.0001) return `Rs ${formatCurrency(0)}`
  return `${value > 0 ? "+" : "-"}Rs ${formatCurrency(absValue)}`
}

export function groupHoldingsByCategory(holdings: Holding[]) {
  const equity: Holding[] = []
  const debt: Holding[] = []
  const other: Holding[] = []
  let equityTotal = 0
  let debtTotal = 0
  let otherTotal = 0
  let equityInvestedTotal = 0
  let debtInvestedTotal = 0
  let otherInvestedTotal = 0
  let equityMissedGains = 0
  let debtMissedGains = 0
  let otherMissedGains = 0

  holdings.forEach((h) => {
    const mg = calculateMissedGains(h) || 0
    if (h.category === "Equity") {
      equity.push(h)
      equityTotal += h.market_value
      equityInvestedTotal += h.cost_value || 0
      equityMissedGains += mg
    } else if (h.category === "Fixed Income") {
      debt.push(h)
      debtTotal += h.market_value
      debtInvestedTotal += h.cost_value || 0
      debtMissedGains += mg
    } else {
      other.push(h)
      otherTotal += h.market_value
      otherInvestedTotal += h.cost_value || 0
      otherMissedGains += mg
    }
  })

  return {
    equityHoldings: equity,
    debtHoldings: debt,
    otherHoldings: other,
    equityTotal,
    debtTotal,
    otherTotal,
    equityInvestedTotal,
    debtInvestedTotal,
    otherInvestedTotal,
    equityMissedGains,
    debtMissedGains,
    otherMissedGains,
  }
}

function compareHoldings(
  a: Holding,
  b: Holding,
  key: HoldingsSortKey,
  dir: "asc" | "desc",
  nowMs: number
): number {
  const mult = dir === "asc" ? 1 : -1
  const num = (v: number | null | undefined): number =>
    (v ?? null) === null ? Number.NaN : (v as number)
  const str = (v: string | null | undefined): string => (v ?? "") || ""
  const dateMs = (d: string | null | undefined): number => {
    if (!d) return Number.NaN
    const t = new Date(d).getTime()
    return Number.isNaN(t) ? Number.NaN : t
  }

  switch (key) {
    case "folio":
      return mult * str(a.folio).toLowerCase().localeCompare(str(b.folio).toLowerCase())
    case "scheme_name":
      return mult * str(a.scheme_name).toLowerCase().localeCompare(str(b.scheme_name).toLowerCase())
    case "sub_category":
      return mult * str(a.sub_category).toLowerCase().localeCompare(str(b.sub_category).toLowerCase())
    case "style_category":
      return mult * str(a.style_category).toLowerCase().localeCompare(str(b.style_category).toLowerCase())
    case "benchmark": {
      const bmA = getBenchmarkName(a) ?? ""
      const bmB = getBenchmarkName(b) ?? ""
      return mult * bmA.toLowerCase().localeCompare(bmB.toLowerCase())
    }
    case "date_of_entry": {
      const ta = dateMs(a.date_of_entry)
      const tb = dateMs(b.date_of_entry)
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
      if (Number.isNaN(ta)) return mult
      if (Number.isNaN(tb)) return -mult
      return mult * (ta - tb)
    }
    case "holding_period": {
      const ya = getYearsFromEntryDate(a.date_of_entry, nowMs)
      const yb = getYearsFromEntryDate(b.date_of_entry, nowMs)
      if (ya === null && yb === null) return 0
      if (ya === null) return mult
      if (yb === null) return -mult
      return mult * (ya - yb)
    }
    case "cost_value":
      return mult * ((a.cost_value ?? 0) - (b.cost_value ?? 0))
    case "market_value":
    case "weight_pct":
      return mult * ((a.market_value ?? 0) - (b.market_value ?? 0))
    case "missed_gains": {
      const ma = getDisplayedMissedGains(calculateMissedGains(a))
      const mb = getDisplayedMissedGains(calculateMissedGains(b))
      if (ma === null && mb === null) return 0
      if (ma === null) return mult
      if (mb === null) return -mult
      return mult * (ma - mb)
    }
    case "xirr": {
      const xa = num(a.xirr)
      const xb = num(b.xirr)
      if (Number.isNaN(xa) && Number.isNaN(xb)) return 0
      if (Number.isNaN(xa)) return mult
      if (Number.isNaN(xb)) return -mult
      return mult * (xa - xb)
    }
    case "benchmark_xirr": {
      const xa = num(a.benchmark_xirr)
      const xb = num(b.benchmark_xirr)
      if (Number.isNaN(xa) && Number.isNaN(xb)) return 0
      if (Number.isNaN(xa)) return mult
      if (Number.isNaN(xb)) return -mult
      return mult * (xa - xb)
    }
    default:
      return 0
  }
}

export function sortHoldingsGroups(
  groups: ReturnType<typeof groupHoldingsByCategory>,
  sortKey: HoldingsSortKey | null,
  sortDir: "asc" | "desc",
  nowMs: number
) {
  if (!sortKey) {
    return {
      sortedEquityHoldings: groups.equityHoldings,
      sortedDebtHoldings: groups.debtHoldings,
      sortedOtherHoldings: groups.otherHoldings,
    }
  }

  const sortList = (list: Holding[]) =>
    [...list].sort((a, b) => compareHoldings(a, b, sortKey, sortDir, nowMs))

  return {
    sortedEquityHoldings: sortList(groups.equityHoldings),
    sortedDebtHoldings: sortList(groups.debtHoldings),
    sortedOtherHoldings: sortList(groups.otherHoldings),
  }
}

export function buildTableRows(
  sorted: ReturnType<typeof sortHoldingsGroups>,
  totals: ReturnType<typeof groupHoldingsByCategory>
): HoldingsTableRow[] {
  const rows: HoldingsTableRow[] = []

  if (sorted.sortedEquityHoldings.length > 0) {
    rows.push({ type: "section", label: "Equity" })
    sorted.sortedEquityHoldings.forEach((h, i) =>
      rows.push({ type: "holding", holding: h, key: `eq-${i}` })
    )
    rows.push({
      type: "subtotal",
      label: "Equity",
      subtotal: totals.equityTotal,
      investedSubtotal: totals.equityInvestedTotal,
      missedGainsSubtotal: totals.equityMissedGains,
    })
  }

  if (sorted.sortedDebtHoldings.length > 0) {
    rows.push({ type: "section", label: "Fixed Income / Debt" })
    sorted.sortedDebtHoldings.forEach((h, i) =>
      rows.push({ type: "holding", holding: h, key: `debt-${i}` })
    )
    rows.push({
      type: "subtotal",
      label: "Debt",
      subtotal: totals.debtTotal,
      investedSubtotal: totals.debtInvestedTotal,
      missedGainsSubtotal: totals.debtMissedGains,
    })
  }

  if (sorted.sortedOtherHoldings.length > 0) {
    rows.push({ type: "section", label: "Others" })
    sorted.sortedOtherHoldings.forEach((h, i) =>
      rows.push({ type: "holding", holding: h, key: `other-${i}` })
    )
    rows.push({
      type: "subtotal",
      label: "Others",
      subtotal: totals.otherTotal,
      investedSubtotal: totals.otherInvestedTotal,
      missedGainsSubtotal: totals.otherMissedGains,
    })
  }

  return rows
}

export function countHoldingRows(rows: HoldingsTableRow[]) {
  return rows.filter((row) => row.type === "holding").length
}

function getCsvCellValue(
  h: Holding,
  columnId: HoldingsColumnId,
  total: number,
  rowNum: number | undefined,
  nowMs: number
): string {
  const displayedMissedGains = getDisplayedMissedGains(calculateMissedGains(h))
  const allocPct = (((h.market_value || 0) / total) * 100).toFixed(2)
  const xirrStr = h.xirr != null ? `${(h.xirr as number).toFixed(1)}%` : ""
  const bmStr = h.benchmark_xirr != null ? `${(h.benchmark_xirr as number).toFixed(2)}%` : ""

  switch (columnId) {
    case "rowNum":
      return rowNum != null ? String(rowNum) : ""
    case "folio":
      return h.folio || ""
    case "scheme_name":
      return h.scheme_name
    case "sub_category":
      return h.sub_category
    case "style_category":
      return h.style_category || ""
    case "benchmark":
      return getBenchmarkName(h)
    case "date_of_entry":
      return h.date_of_entry || ""
    case "holding_period":
      return formatYearsFromEntryDate(h.date_of_entry, nowMs) ?? ""
    case "cost_value":
      return formatCurrency(h.cost_value || 0)
    case "market_value":
      return formatCurrency(h.market_value || 0)
    case "weight_pct":
      return `${allocPct}%`
    case "missed_gains":
      return displayedMissedGains != null ? formatSignedCurrencyValue(displayedMissedGains) : ""
    case "xirr":
      return xirrStr
    case "benchmark_xirr":
      return bmStr
    default:
      return ""
  }
}

export function downloadHoldingsCsv(
  sorted: ReturnType<typeof sortHoldingsGroups>,
  totalMarketValue: number,
  nowMs: number
) {
  const total = totalMarketValue || 1
  const headers = CSV_COLUMN_ORDER.map(
    (id) => HOLDINGS_COLUMNS.find((col) => col.id === id)?.label ?? id
  )
  const rows: string[][] = []
  let rowNum = 0

  const pushHoldings = (list: Holding[]) => {
    list.forEach((h) => {
      rowNum += 1
      rows.push(CSV_COLUMN_ORDER.map((colId) => getCsvCellValue(h, colId, total, rowNum, nowMs)))
    })
  }

  if (sorted.sortedEquityHoldings.length > 0) {
    rows.push(["EQUITY"])
    pushHoldings(sorted.sortedEquityHoldings)
    rows.push([])
  }
  if (sorted.sortedDebtHoldings.length > 0) {
    rows.push(["FIXED INCOME / DEBT"])
    pushHoldings(sorted.sortedDebtHoldings)
    rows.push([])
  }
  if (sorted.sortedOtherHoldings.length > 0) {
    rows.push(["OTHERS"])
    pushHoldings(sorted.sortedOtherHoldings)
  }

  const csvContent = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `holdings_export_${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
