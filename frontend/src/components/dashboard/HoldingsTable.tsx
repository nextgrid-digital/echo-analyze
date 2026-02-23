import { memo, useMemo, useState } from "react"
import { WideCard } from "./cards/WideCard"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Search, Download, ArrowUp, ArrowDown } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import type { Holding } from "@/types/api"

interface HoldingsTableProps {
  holdings: Holding[]
  totalMarketValue: number
}

export const HoldingsTable = memo(function HoldingsTable({
  holdings,
  totalMarketValue,
}: HoldingsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterSubCategory, setFilterSubCategory] = useState("")
  const [filterStyle, setFilterStyle] = useState("")
  const total = totalMarketValue || 1

  const filterOptions = useMemo(() => {
    const categories = Array.from(new Set(holdings.map(h => h.category).filter(Boolean))).sort()
    const subCategories = Array.from(new Set(holdings.map(h => h.sub_category).filter(Boolean))).sort()
    const styles = Array.from(new Set(holdings.map(h => h.style_category).filter((s): s is string => Boolean(s)))).sort()
    return { categories, subCategories, styles }
  }, [holdings])

  const filteredByFilters = useMemo(() => {
    return holdings.filter(h => {
      if (filterCategory && h.category !== filterCategory) return false
      if (filterSubCategory && h.sub_category !== filterSubCategory) return false
      if (filterStyle && (h.style_category || "") !== filterStyle) return false
      return true
    })
  }, [holdings, filterCategory, filterSubCategory, filterStyle])

  const filteredHoldings = useMemo(() => {
    if (!searchQuery.trim()) return filteredByFilters
    const query = searchQuery.toLowerCase().trim()
    return filteredByFilters.filter(h => 
      h.scheme_name.toLowerCase().includes(query) ||
      h.sub_category.toLowerCase().includes(query) ||
      h.category.toLowerCase().includes(query) ||
      (h.style_category && h.style_category.toLowerCase().includes(query)) ||
      (h.folio || "").toLowerCase().includes(query)
    )
  }, [filteredByFilters, searchQuery])

  // Group holdings by category
  const { equityHoldings, debtHoldings, otherHoldings, equityTotal, debtTotal, otherTotal, equityInvestedTotal, debtInvestedTotal, otherInvestedTotal } = useMemo(() => {
    const equity: Holding[] = []
    const debt: Holding[] = []
    const other: Holding[] = []
    let eqTotal = 0
    let dbTotal = 0
    let otTotal = 0
    let eqInvestedTotal = 0
    let dbInvestedTotal = 0
    let otInvestedTotal = 0

    filteredHoldings.forEach(h => {
      if (h.category === "Equity") {
        equity.push(h)
        eqTotal += h.market_value
        eqInvestedTotal += h.cost_value || 0
      } else if (h.category === "Fixed Income") {
        debt.push(h)
        dbTotal += h.market_value
        dbInvestedTotal += h.cost_value || 0
      } else {
        other.push(h)
        otTotal += h.market_value
        otInvestedTotal += h.cost_value || 0
      }
    })

    return {
      equityHoldings: equity,
      debtHoldings: debt,
      otherHoldings: other,
      equityTotal: eqTotal,
      debtTotal: dbTotal,
      otherTotal: otTotal,
      equityInvestedTotal: eqInvestedTotal,
      debtInvestedTotal: dbInvestedTotal,
      otherInvestedTotal: otInvestedTotal
    }
  }, [filteredHoldings])

  // Helper function to get benchmark name based on category/sub_category
  const getBenchmarkName = (holding: Holding): string | null => {
    const category = holding.category.toLowerCase()
    const subCategory = holding.sub_category.toLowerCase()
    const schemeName = holding.scheme_name.toLowerCase()

    // Check if it's an index fund first
    if (schemeName.includes("nifty 50") || schemeName.includes("nifty50")) {
      return "Nifty 50"
    }
    if (schemeName.includes("nifty midcap") || schemeName.includes("niftymidcap")) {
      return "Nifty Midcap 150"
    }
    if (schemeName.includes("nifty smallcap") || schemeName.includes("niftysmallcap")) {
      return "Nifty Smallcap 250"
    }
    if (schemeName.includes("nifty 500") || schemeName.includes("nifty500")) {
      return "Nifty 500"
    }
    if (schemeName.includes("sensex")) {
      return "Sensex"
    }

    // Equity benchmarks
    if (category === "equity") {
      if (subCategory.includes("large cap") || subCategory.includes("large-cap")) {
        return "Nifty 50"
      }
      if (subCategory.includes("mid cap") || subCategory.includes("mid-cap")) {
        return "Nifty Midcap 150"
      }
      if (subCategory.includes("small cap") || subCategory.includes("small-cap")) {
        return "Nifty Smallcap 250"
      }
      if (subCategory.includes("flexi cap") || subCategory.includes("flexi-cap") || subCategory.includes("multi cap") || subCategory.includes("multi-cap")) {
        return "Nifty 500"
      }
      if (subCategory.includes("elss")) {
        return "Nifty 500"
      }
      if (subCategory.includes("sectoral") || subCategory.includes("thematic")) {
        return "Nifty 50"
      }
      // Default equity benchmark
      return "Nifty 50"
    }

    // Fixed Income benchmarks
    if (category === "fixed income") {
      if (subCategory.includes("liquid") || subCategory.includes("money market")) {
        return "CRISIL Liquid"
      }
      if (subCategory.includes("ultra short term") || subCategory.includes("ultra-short")) {
        return "CRISIL Ultra Short Term"
      }
      if (subCategory.includes("short term") || subCategory.includes("short-term")) {
        return "CRISIL Short Term"
      }
      if (subCategory.includes("medium term") || subCategory.includes("medium-term")) {
        return "CRISIL Medium Term"
      }
      if (subCategory.includes("long term") || subCategory.includes("long-term")) {
        return "CRISIL Long Term"
      }
      // Default debt benchmark
      return "CRISIL Composite"
    }

    return null
  }

  const formatOptionalPercent = (value: number | null | undefined): string =>
    value !== null && value !== undefined ? value.toFixed(2) : ""

  const formatOptionalCurrency = (value: number | null | undefined): string =>
    value !== null && value !== undefined ? formatCurrency(value) : ""

  const getYearsFromEntryDate = (entryDate: string | null | undefined): number | null => {
    if (!entryDate) return null
    const parsed = new Date(entryDate)
    if (Number.isNaN(parsed.getTime())) return null

    const elapsedMs = Date.now() - parsed.getTime()
    if (elapsedMs < 0) return null

    return elapsedMs / (1000 * 60 * 60 * 24 * 365.25)
  }

  const formatYearsFromEntryDate = (entryDate: string | null | undefined): string | null => {
    const years = getYearsFromEntryDate(entryDate)
    if (years === null) return null
    return `${years.toFixed(1)} yrs`
  }

  const calculateMissedGains = (holding: Holding): number | null => {
    const fundXirr = holding.xirr
    const benchmarkXirr = holding.benchmark_xirr
    if (fundXirr === null || fundXirr === undefined) return null
    if (benchmarkXirr === null || benchmarkXirr === undefined) return null

    const invested = holding.cost_value || 0
    if (invested <= 0) return null

    const years = getYearsFromEntryDate(holding.date_of_entry)
    if (years === null) return null

    const fundGrowthBase = 1 + fundXirr / 100
    const benchmarkGrowthBase = 1 + benchmarkXirr / 100
    if (fundGrowthBase <= 0 || benchmarkGrowthBase <= 0) return null

    const fundValueByXirr = invested * Math.pow(fundGrowthBase, years)
    const benchmarkValueByXirr = invested * Math.pow(benchmarkGrowthBase, years)
    return Math.abs(benchmarkValueByXirr - fundValueByXirr)
  }

  type SortKey = "folio" | "scheme_name" | "date_of_entry" | "holding_period" | "cost_value" | "market_value" | "return_pct" | "missed_gains" | "xirr"
  const compareHoldings = (a: Holding, b: Holding, key: SortKey, dir: "asc" | "desc"): number => {
    const mult = dir === "asc" ? 1 : -1
    const num = (v: number | null | undefined): number => (v ?? null) === null ? Number.NaN : (v as number)
    const str = (v: string | null | undefined): string => (v ?? "") || ""
    const dateMs = (d: string | null | undefined): number => {
      if (!d) return Number.NaN
      const t = new Date(d).getTime()
      return Number.isNaN(t) ? Number.NaN : t
    }
    switch (key) {
      case "folio":
        return mult * (str(a.folio).toLowerCase().localeCompare(str(b.folio).toLowerCase()))
      case "scheme_name":
        return mult * (str(a.scheme_name).toLowerCase().localeCompare(str(b.scheme_name).toLowerCase()))
      case "date_of_entry": {
        const ta = dateMs(a.date_of_entry)
        const tb = dateMs(b.date_of_entry)
        if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
        if (Number.isNaN(ta)) return mult
        if (Number.isNaN(tb)) return -mult
        return mult * (ta - tb)
      }
      case "holding_period": {
        const ya = getYearsFromEntryDate(a.date_of_entry)
        const yb = getYearsFromEntryDate(b.date_of_entry)
        if (ya === null && yb === null) return 0
        if (ya === null) return mult
        if (yb === null) return -mult
        return mult * (ya - yb)
      }
      case "cost_value":
        return mult * ((a.cost_value ?? 0) - (b.cost_value ?? 0))
      case "market_value":
        return mult * ((a.market_value ?? 0) - (b.market_value ?? 0))
      case "return_pct": {
        const ra = num(a.return_pct)
        const rb = num(b.return_pct)
        if (Number.isNaN(ra) && Number.isNaN(rb)) return 0
        if (Number.isNaN(ra)) return mult
        if (Number.isNaN(rb)) return -mult
        return mult * (ra - rb)
      }
      case "missed_gains": {
        const ma = calculateMissedGains(a)
        const mb = calculateMissedGains(b)
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
      default:
        return 0
    }
  }

  const { sortedEquityHoldings, sortedDebtHoldings, sortedOtherHoldings } = useMemo(() => {
    if (!sortKey) {
      return {
        sortedEquityHoldings: equityHoldings,
        sortedDebtHoldings: debtHoldings,
        sortedOtherHoldings: otherHoldings,
      }
    }
    const key = sortKey as SortKey
    return {
      sortedEquityHoldings: [...equityHoldings].sort((a, b) => compareHoldings(a, b, key, sortDir)),
      sortedDebtHoldings: [...debtHoldings].sort((a, b) => compareHoldings(a, b, key, sortDir)),
      sortedOtherHoldings: [...otherHoldings].sort((a, b) => compareHoldings(a, b, key, sortDir)),
    }
  }, [equityHoldings, debtHoldings, otherHoldings, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  // CSV download handler
  const handleDownloadCSV = () => {
    const headers = [
      "Folio number",
      "Fund Name",
      "Category",
      "Sub Category",
      "Style",
      "Entry Date",
      "Holding Period",
      "Invested Value (₹)",
      "Market Value (₹)",
      "Allocation (%)",
      "Absolute Returns (%)",
      "Missed Gains (Rs)",
      "XIRR (%)",
      "Benchmark XIRR (%)",
      "Benchmark Name"
    ]

    const rows: string[][] = []

    // Add equity holdings
    if (sortedEquityHoldings.length > 0) {
      rows.push(["EQUITY"])
      sortedEquityHoldings.forEach(h => {
        const benchmarkName = getBenchmarkName(h) || ""
        rows.push([
          h.folio || "",
          h.scheme_name,
          h.category,
          h.sub_category,
          h.style_category || "",
          h.date_of_entry || "",
          formatYearsFromEntryDate(h.date_of_entry) ?? "",
          formatCurrency(h.cost_value || 0),
          formatCurrency(h.market_value || 0),
          (((h.market_value || 0) / total) * 100).toFixed(2),
          (h.return_pct ?? 0).toFixed(2),
          formatOptionalCurrency(calculateMissedGains(h)),
          formatOptionalPercent(h.xirr),
          formatOptionalPercent(h.benchmark_xirr),
          benchmarkName
        ])
      })
      rows.push([]) // Empty row after equity
    }

    // Add debt holdings
    if (sortedDebtHoldings.length > 0) {
      rows.push(["FIXED INCOME / DEBT"])
      sortedDebtHoldings.forEach(h => {
        const benchmarkName = getBenchmarkName(h) || ""
        rows.push([
          h.folio || "",
          h.scheme_name,
          h.category,
          h.sub_category,
          h.style_category || "",
          h.date_of_entry || "",
          formatYearsFromEntryDate(h.date_of_entry) ?? "",
          formatCurrency(h.cost_value || 0),
          formatCurrency(h.market_value || 0),
          (((h.market_value || 0) / total) * 100).toFixed(2),
          (h.return_pct ?? 0).toFixed(2),
          formatOptionalCurrency(calculateMissedGains(h)),
          formatOptionalPercent(h.xirr),
          formatOptionalPercent(h.benchmark_xirr),
          benchmarkName
        ])
      })
      rows.push([]) // Empty row after debt
    }

    // Add other holdings
    if (sortedOtherHoldings.length > 0) {
      rows.push(["OTHERS"])
      sortedOtherHoldings.forEach(h => {
        const benchmarkName = getBenchmarkName(h) || ""
        rows.push([
          h.folio || "",
          h.scheme_name,
          h.category,
          h.sub_category,
          h.style_category || "",
          h.date_of_entry || "",
          formatYearsFromEntryDate(h.date_of_entry) ?? "",
          formatCurrency(h.cost_value || 0),
          formatCurrency(h.market_value || 0),
          (((h.market_value || 0) / total) * 100).toFixed(2),
          (h.return_pct ?? 0).toFixed(2),
          formatOptionalCurrency(calculateMissedGains(h)),
          formatOptionalPercent(h.xirr),
          formatOptionalPercent(h.benchmark_xirr),
          benchmarkName
        ])
      })
    }

    // Convert to CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `holdings_export_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderSubtotalRow = (label: string, subtotal: number, investedSubtotal: number) => (
    <TableRow className="bg-muted/30 border-t-2 border-border">
      <TableCell colSpan={4} className="px-4 py-3 sm:px-8 sm:py-5 font-bold text-foreground">
        {label} Total
      </TableCell>
      <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
        <div className="font-bold text-foreground font-mono text-base">
          ₹{formatCurrency(investedSubtotal)}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
        <div className="font-bold text-foreground font-mono text-base">
          ₹{formatCurrency(subtotal)}
        </div>
        <div className="text-[10px] text-muted-foreground font-bold font-mono">
          {((subtotal / total) * 100).toFixed(1)}%
        </div>
      </TableCell>
      <TableCell colSpan={3} />
    </TableRow>
  )

  const renderHoldingCard = (h: Holding, i: string | number) => {
    const benchmarkName = getBenchmarkName(h)
    const hasXirr = h.xirr !== null && h.xirr !== undefined
    const hasBenchmarkXirr = h.benchmark_xirr !== null && h.benchmark_xirr !== undefined
    const yearsFromEntry = formatYearsFromEntryDate(h.date_of_entry)
    const missedGains = calculateMissedGains(h)
    const isBelowBenchmark = hasXirr && hasBenchmarkXirr ? (h.xirr as number) < (h.benchmark_xirr as number) : null
    const xirrColorClass = hasXirr ? (hasBenchmarkXirr ? (isBelowBenchmark ? "text-red-500" : "text-green-500") : (h.xirr as number) < 0 ? "text-red-500" : "text-green-500") : "text-muted-foreground"
    const missedGainsColorClass = isBelowBenchmark === null ? "text-muted-foreground" : isBelowBenchmark ? "text-red-500" : "text-green-500"
    const returnColorClass = (h.gain_loss ?? 0) >= 0 ? "text-primary" : "text-destructive"
    return (
      <div key={i} className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Folio number</p>
          <p className="text-xs font-mono text-foreground">{h.folio || "-"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Fund name</p>
          <p className="font-bold text-foreground text-sm break-words">{h.scheme_name}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {h.style_category && <Badge variant="secondary" className="text-[10px] uppercase">{h.style_category}</Badge>}
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{h.sub_category}</span>
            {benchmarkName && <Badge variant="outline" className="text-[10px] uppercase">{benchmarkName}</Badge>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Entry date</p>
            <p className="text-xs font-mono">{h.date_of_entry || "-"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Holding period</p>
            <p className="text-xs font-mono">{yearsFromEntry ?? "-"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-border/50 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Invested</p>
            <p className="font-mono font-semibold">₹{formatCurrency(h.cost_value || 0)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Current value</p>
            <p className="font-mono font-semibold">₹{formatCurrency(h.market_value || 0)}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{(((h.market_value || 0) / total) * 100).toFixed(1)}%</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Abs returns</p>
            <p className={`font-mono font-semibold ${returnColorClass}`}>{h.return_pct ?? 0}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Missed gains</p>
            <p className={`font-mono font-semibold ${missedGainsColorClass}`}>{missedGains !== null ? `₹${formatCurrency(missedGains)}` : "-"}</p>
          </div>
        </div>
        <div className="border-t border-border/50 pt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">XIRR / Benchmark</p>
          <p className={`font-mono font-semibold text-sm ${xirrColorClass}`}>{hasXirr ? `${(h.xirr as number).toFixed(1)}%` : "-"}</p>
          {hasBenchmarkXirr && <p className="text-[10px] text-muted-foreground font-mono">BM: {(h.benchmark_xirr as number).toFixed(1)}%</p>}
        </div>
      </div>
    )
  }

  const renderSubtotalCard = (label: string, subtotal: number, investedSubtotal: number) => (
    <div className="rounded-lg border-2 border-border bg-muted/30 p-4">
      <p className="font-bold text-foreground text-sm">{label} Total</p>
      <div className="mt-2 flex justify-between items-baseline">
        <span className="text-xs text-muted-foreground">Invested</span>
        <span className="font-mono font-bold">₹{formatCurrency(investedSubtotal)}</span>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-muted-foreground">Current</span>
        <span className="font-mono font-bold">₹{formatCurrency(subtotal)}</span>
      </div>
      <p className="text-[10px] text-muted-foreground font-mono mt-1">{((subtotal / total) * 100).toFixed(1)}% of portfolio</p>
    </div>
  )

  const renderHoldingRow = (h: Holding, i: string | number) => {
    const benchmarkName = getBenchmarkName(h)
    const hasXirr = h.xirr !== null && h.xirr !== undefined
    const hasBenchmarkXirr = h.benchmark_xirr !== null && h.benchmark_xirr !== undefined
    const yearsFromEntry = formatYearsFromEntryDate(h.date_of_entry)
    const missedGains = calculateMissedGains(h)
    const isBelowBenchmark = hasXirr && hasBenchmarkXirr
      ? (h.xirr as number) < (h.benchmark_xirr as number)
      : null
    const xirrColorClass = hasXirr
      ? hasBenchmarkXirr
        ? isBelowBenchmark
          ? "text-red-500"
          : "text-green-500"
        : (h.xirr as number) < 0
          ? "text-red-500"
          : "text-green-500"
      : "text-muted-foreground"
    const missedGainsColorClass =
      isBelowBenchmark === null
        ? "text-muted-foreground"
        : isBelowBenchmark
          ? "text-red-500"
          : "text-green-500"
    return (
      <TableRow key={i} className="hover:bg-muted/50">
        <TableCell className="px-4 py-3 sm:px-8 sm:py-5 min-w-[72px] whitespace-nowrap">
          <div className="text-xs font-mono text-muted-foreground">
            {h.folio || "-"}
          </div>
        </TableCell>
        <TableCell className="px-4 py-3 sm:px-8 sm:py-5 whitespace-normal max-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="font-bold text-foreground text-sm flex-1 min-w-0 cursor-help break-words leading-tight overflow-hidden"
                  style={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                  }}
                >
                  {h.scheme_name}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs break-words">{h.scheme_name}</p>
              </TooltipContent>
            </Tooltip>
            {h.style_category && (
              <Badge variant="secondary" className="text-[10px] uppercase flex-shrink-0">
                {h.style_category}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate" title={h.sub_category}>
              {h.sub_category}
            </div>
            {benchmarkName && (
              <Badge variant="outline" className="text-[10px] uppercase flex-shrink-0">
                {benchmarkName}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="px-4 py-3 sm:px-8 sm:py-5">
          <div className="text-xs font-mono text-muted-foreground">
            {h.date_of_entry || "-"}
          </div>
        </TableCell>
        <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
          <div className="text-[10px] font-mono text-muted-foreground">
            {yearsFromEntry ?? "-"}
          </div>
        </TableCell>
        <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
          <div className="font-bold text-foreground font-mono">
            ₹{formatCurrency(h.cost_value || 0)}
          </div>
        </TableCell>
        <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
          <div className="font-bold text-foreground font-mono">
            ₹{formatCurrency(h.market_value || 0)}
          </div>
          <div className="text-[10px] text-muted-foreground font-bold font-mono">
            {(((h.market_value || 0) / total) * 100).toFixed(1)}%
          </div>
        </TableCell>
        <TableCell
          className={`px-4 py-3 sm:px-8 sm:py-5 text-right font-bold font-mono ${(h.gain_loss ?? 0) >= 0 ? "text-primary" : "text-destructive"
            }`}
        >
          {h.return_pct ?? 0}%
        </TableCell>
        <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
          <div className={`font-bold font-mono text-sm ${missedGainsColorClass}`}>
            {missedGains !== null ? `\u20B9${formatCurrency(missedGains)}` : "-"}
          </div>
        </TableCell>
        <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
          <div className={`font-bold font-mono text-sm ${xirrColorClass}`}>
            {hasXirr ? `${(h.xirr as number).toFixed(1)}%` : "-"}
          </div>
          <div className="text-[10px] text-muted-foreground font-bold font-mono">
            BM: {hasBenchmarkXirr ? `${(h.benchmark_xirr as number).toFixed(1)}%` : "-"}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="mt-12 pt-12 border-t border-border">
      <div className="flex items-center justify-between gap-2 mb-6">
        <h3 className="font-bold text-xl text-foreground">
          Full Holding List
        </h3>
        <SectionInfoTooltip
          title="Full Holding List"
          formula={
            <>
              Value = Units × NAV<br />
              Allocation % = (Holding Value ÷ Total Portfolio Value) × 100<br />
              Return % = ((Current Value − Cost Value) ÷ Cost Value) × 100
            </>
          }
          content={
            <>
              All holdings from your statement: scheme name, category, market value (in ₹), allocation % of portfolio, return %, and style (e.g. Growth). Holdings are grouped by Equity and Debt with subtotals.
            </>
          }
        />
      </div>
      <WideCard>
        {/* Search, filters, and Download Button */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by fund name, category, style, or folio number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full max-w-md"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-9 rounded-none border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-subcategory">Sub-category</label>
            <select
              id="filter-subcategory"
              value={filterSubCategory}
              onChange={(e) => setFilterSubCategory(e.target.value)}
              className="h-9 rounded-none border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-w-[120px]"
              aria-label="Filter by sub-category"
            >
              <option value="">All sub-categories</option>
              {filterOptions.subCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-style">Style</label>
            <select
              id="filter-style"
              value={filterStyle}
              onChange={(e) => setFilterStyle(e.target.value)}
              className="h-9 rounded-none border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Filter by style"
            >
              <option value="">All styles</option>
              {filterOptions.styles.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleDownloadCSV}
            variant="outline"
            size="default"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
        </div>
        {/* Mobile: card layout (no horizontal scroll, readable on small screens) */}
        <div className="md:hidden space-y-6">
          {sortedEquityHoldings.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-wider text-primary">Equity</p>
              {sortedEquityHoldings.map((h, i) => renderHoldingCard(h, `eq-${i}`))}
              {renderSubtotalCard("Equity", equityTotal, equityInvestedTotal)}
            </div>
          )}
          {sortedDebtHoldings.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-wider text-primary">Fixed Income / Debt</p>
              {sortedDebtHoldings.map((h, i) => renderHoldingCard(h, `debt-${i}`))}
              {renderSubtotalCard("Debt", debtTotal, debtInvestedTotal)}
            </div>
          )}
          {sortedOtherHoldings.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-wider text-primary">Others</p>
              {sortedOtherHoldings.map((h, i) => renderHoldingCard(h, `other-${i}`))}
              {renderSubtotalCard("Others", otherTotal, otherInvestedTotal)}
            </div>
          )}
        </div>

        {/* Desktop: table with horizontal scroll */}
        <div className="hidden md:block">
          <p className="text-xs text-muted-foreground mb-2">
            Scroll horizontally to see all columns.
          </p>
          <div className="w-full max-w-full -mx-1 sm:-mx-2 overflow-x-auto overflow-y-visible scroll-smooth touch-pan-x rounded border border-border/30" aria-label="Holdings table - scroll horizontally for more columns">
            <div className="inline-block min-w-[880px] align-middle">
              <table className="w-full caption-bottom text-sm min-w-[880px] table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted border-b border-border">
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 w-[10%] min-w-[72px] p-0">
                      <button type="button" onClick={() => handleSort("folio")} className="flex w-full items-center gap-1 py-3 px-4 sm:px-8 text-left hover:bg-muted/80 transition-colors" aria-sort={sortKey === "folio" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                        Folio number
                        {sortKey === "folio" && (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
                      </button>
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 w-[25%] p-0">
                      <button type="button" onClick={() => handleSort("scheme_name")} className="flex w-full items-center gap-1 py-3 px-4 sm:px-8 text-left hover:bg-muted/80 transition-colors" aria-sort={sortKey === "scheme_name" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                        Fund Name / Category
                        {sortKey === "scheme_name" && (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
                      </button>
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 w-[12%] p-0">
                      <button type="button" onClick={() => handleSort("date_of_entry")} className="flex w-full items-center gap-1 py-3 px-4 sm:px-8 text-left hover:bg-muted/80 transition-colors" aria-sort={sortKey === "date_of_entry" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                        Entry Date
                        {sortKey === "date_of_entry" && (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
                      </button>
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right w-[9%] p-0">
                      <button type="button" onClick={() => handleSort("holding_period")} className="flex w-full items-center justify-end gap-1 py-3 px-4 sm:px-8 text-left hover:bg-muted/80 transition-colors" aria-sort={sortKey === "holding_period" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                        Holding Period
                        {sortKey === "holding_period" && (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
                      </button>
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right w-[14%] p-0">
                      <button type="button" onClick={() => handleSort("cost_value")} className="flex w-full items-center justify-end gap-1 py-3 px-4 sm:px-8 text-left hover:bg-muted/80 transition-colors" aria-sort={sortKey === "cost_value" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                        Invested Value
                        {sortKey === "cost_value" && (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
                      </button>
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right w-[14%] p-0">
                      <button type="button" onClick={() => handleSort("market_value")} className="flex w-full items-center justify-end gap-1 py-3 px-4 sm:px-8 text-left hover:bg-muted/80 transition-colors" aria-sort={sortKey === "market_value" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                        Current Value
                        {sortKey === "market_value" && (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
                      </button>
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right w-[11%] p-0">
                      <button type="button" onClick={() => handleSort("return_pct")} className="flex w-full items-center justify-end gap-1 py-3 px-4 sm:px-8 text-left hover:bg-muted/80 transition-colors" aria-sort={sortKey === "return_pct" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                        Abs Returns
                        {sortKey === "return_pct" && (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
                      </button>
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right w-[10%] p-0">
                      <button type="button" onClick={() => handleSort("missed_gains")} className="flex w-full items-center justify-end gap-1 py-3 px-4 sm:px-8 text-left hover:bg-muted/80 transition-colors" aria-sort={sortKey === "missed_gains" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                        Missed Gains
                        {sortKey === "missed_gains" && (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
                      </button>
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right w-[14%] p-0">
                      <button type="button" onClick={() => handleSort("xirr")} className="flex w-full items-center justify-end gap-1 py-3 px-4 sm:px-8 text-left hover:bg-muted/80 transition-colors" aria-sort={sortKey === "xirr" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                        XIRR / BM
                        {sortKey === "xirr" && (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEquityHoldings.length > 0 && (
                    <>
                      <TableRow className="bg-primary/10">
                        <TableCell colSpan={9} className="px-4 py-2 sm:px-8 sm:py-3 font-bold text-sm uppercase tracking-wider text-primary">
                          Equity
                        </TableCell>
                      </TableRow>
                      {sortedEquityHoldings.map((h, i) => renderHoldingRow(h, `eq-${i}`))}
                      {renderSubtotalRow("Equity", equityTotal, equityInvestedTotal)}
                    </>
                  )}

                  {sortedDebtHoldings.length > 0 && (
                    <>
                      <TableRow className="bg-primary/10">
                        <TableCell colSpan={9} className="px-4 py-2 sm:px-8 sm:py-3 font-bold text-sm uppercase tracking-wider text-primary">
                          Fixed Income / Debt
                        </TableCell>
                      </TableRow>
                      {sortedDebtHoldings.map((h, i) => renderHoldingRow(h, `debt-${i}`))}
                      {renderSubtotalRow("Debt", debtTotal, debtInvestedTotal)}
                    </>
                  )}

                  {sortedOtherHoldings.length > 0 && (
                    <>
                      <TableRow className="bg-primary/10">
                        <TableCell colSpan={9} className="px-4 py-2 sm:px-8 sm:py-3 font-bold text-sm uppercase tracking-wider text-primary">
                          Others
                        </TableCell>
                      </TableRow>
                      {sortedOtherHoldings.map((h, i) => renderHoldingRow(h, `other-${i}`))}
                      {renderSubtotalRow("Others", otherTotal, otherInvestedTotal)}
                    </>
                  )}
                </TableBody>
              </table>
            </div>
          </div>
        </div>
      </WideCard>
    </div>
  )
})
