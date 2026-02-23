import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { WideCard } from "./cards/WideCard"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Search, Download, ArrowUp, ArrowDown, GripVertical } from "lucide-react"
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

  const DEFAULT_COL_WIDTHS = [44, 88, 200, 100, 72, 88, 96, 84, 106, 116, 88, 92, 112]
  const MIN_COL_WIDTHS = [36, 64, 100, 72, 56, 72, 64, 80, 80, 80, 72, 72, 80]
  const [columnWidths, setColumnWidths] = useState<number[]>(() => DEFAULT_COL_WIDTHS)
  const [resizingIndex, setResizingIndex] = useState<number | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidths = useRef<number[]>([])

  type SortKey = "folio" | "scheme_name" | "sub_category" | "style_category" | "benchmark" | "date_of_entry" | "holding_period" | "cost_value" | "market_value" | "return_pct" | "missed_gains" | "xirr"
  const COLUMNS: { key: SortKey | null; label: string; align: "left" | "right" }[] = [
    { key: null, label: "#", align: "right" },
    { key: "folio", label: "Folio number", align: "left" },
    { key: "scheme_name", label: "Fund name", align: "left" },
    { key: "sub_category", label: "Sub-category", align: "left" },
    { key: "style_category", label: "Style", align: "left" },
    { key: "benchmark", label: "Benchmark", align: "left" },
    { key: "date_of_entry", label: "Entry Date", align: "left" },
    { key: "holding_period", label: "Holding Period", align: "right" },
    { key: "cost_value", label: "Invested Value", align: "right" },
    { key: "market_value", label: "Current Value", align: "right" },
    { key: "return_pct", label: "Abs Returns", align: "right" },
    { key: "missed_gains", label: "Missed Gains", align: "right" },
    { key: "xirr", label: "XIRR / BM", align: "right" },
  ]
  const [columnOrder, setColumnOrder] = useState<number[]>(() => COLUMNS.map((_, i) => i))
  const [draggedColPosition, setDraggedColPosition] = useState<number | null>(null)

  const handleColumnDragStart = useCallback((position: number, e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", String(position))
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setDragImage((e.target as HTMLElement).closest("th") ?? e.target as HTMLElement, 0, 0)
    setDraggedColPosition(position)
  }, [])

  const handleColumnDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleColumnDrop = useCallback((targetPosition: number, e: React.DragEvent) => {
    e.preventDefault()
    if (draggedColPosition === null) return
    if (draggedColPosition === targetPosition) {
      setDraggedColPosition(null)
      return
    }
    setColumnOrder(prev => {
      const next = [...prev]
      const [removed] = next.splice(draggedColPosition, 1)
      next.splice(targetPosition, 0, removed)
      return next
    })
    setDraggedColPosition(null)
  }, [draggedColPosition])

  const handleColumnDragEnd = useCallback(() => {
    setDraggedColPosition(null)
  }, [])

  const handleResizeStart = useCallback((colIndex: number, e: React.MouseEvent) => {
    e.preventDefault()
    setResizingIndex(colIndex)
    resizeStartX.current = e.clientX
    resizeStartWidths.current = [...columnWidths]
  }, [columnWidths])

  useEffect(() => {
    if (resizingIndex === null) return
    const colId = columnOrder[resizingIndex]
    if (colId === undefined) return
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current
      setColumnWidths(prev => {
        const next = [...prev]
        const minW = MIN_COL_WIDTHS[colId]
        const newWi = Math.max(minW, (resizeStartWidths.current[colId] ?? minW) + delta)
        next[colId] = newWi
        return next
      })
    }
    const onUp = () => setResizingIndex(null)
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [resizingIndex, columnOrder])

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
      case "sub_category":
        return mult * (str(a.sub_category).toLowerCase().localeCompare(str(b.sub_category).toLowerCase()))
      case "style_category":
        return mult * (str(a.style_category).toLowerCase().localeCompare(str(b.style_category).toLowerCase()))
      case "benchmark": {
        const bmA = getBenchmarkName(a) ?? ""
        const bmB = getBenchmarkName(b) ?? ""
        return mult * (bmA.toLowerCase().localeCompare(bmB.toLowerCase()))
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

  type TableRowItem =
    | { type: "section"; label: string }
    | { type: "holding"; holding: Holding; key: string }
    | { type: "subtotal"; label: string; subtotal: number; investedSubtotal: number }
  const tableRows = useMemo((): TableRowItem[] => {
    const rows: TableRowItem[] = []
    if (sortedEquityHoldings.length > 0) {
      rows.push({ type: "section", label: "Equity" })
      sortedEquityHoldings.forEach((h, i) => rows.push({ type: "holding", holding: h, key: `eq-${i}` }))
      rows.push({ type: "subtotal", label: "Equity", subtotal: equityTotal, investedSubtotal: equityInvestedTotal })
    }
    if (sortedDebtHoldings.length > 0) {
      rows.push({ type: "section", label: "Fixed Income / Debt" })
      sortedDebtHoldings.forEach((h, i) => rows.push({ type: "holding", holding: h, key: `debt-${i}` }))
      rows.push({ type: "subtotal", label: "Debt", subtotal: debtTotal, investedSubtotal: debtInvestedTotal })
    }
    if (sortedOtherHoldings.length > 0) {
      rows.push({ type: "section", label: "Others" })
      sortedOtherHoldings.forEach((h, i) => rows.push({ type: "holding", holding: h, key: `other-${i}` }))
      rows.push({ type: "subtotal", label: "Others", subtotal: otherTotal, investedSubtotal: otherInvestedTotal })
    }
    return rows
  }, [sortedEquityHoldings, sortedDebtHoldings, sortedOtherHoldings, equityTotal, equityInvestedTotal, debtTotal, debtInvestedTotal, otherTotal, otherInvestedTotal])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  // CSV download: respect current column order
  const getCsvCellValue = (h: Holding, colId: number, rowNum?: number): string => {
    const missedGains = calculateMissedGains(h)
    const allocPct = (((h.market_value || 0) / total) * 100).toFixed(2)
    const xirrStr = h.xirr != null ? `${(h.xirr as number).toFixed(1)}%` : ""
    const bmStr = h.benchmark_xirr != null ? `BM ${(h.benchmark_xirr as number).toFixed(1)}%` : ""
    switch (colId) {
      case 0: return rowNum != null ? String(rowNum) : ""
      case 1: return h.folio || ""
      case 2: return h.scheme_name
      case 3: return h.sub_category
      case 4: return h.style_category || ""
      case 5: return getBenchmarkName(h) ?? ""
      case 6: return h.date_of_entry || ""
      case 7: return formatYearsFromEntryDate(h.date_of_entry) ?? ""
      case 8: return formatCurrency(h.cost_value || 0)
      case 9: return formatCurrency(h.market_value || 0) + " (" + allocPct + "%)"
      case 10: return (h.return_pct ?? 0) + "%"
      case 11: return missedGains != null ? formatCurrency(missedGains) : ""
      case 12: return bmStr ? `${xirrStr} / ${bmStr}` : xirrStr
      default: return ""
    }
  }

  const handleDownloadCSV = () => {
    const headers = columnOrder.map(colId => COLUMNS[colId].label)

    const rows: string[][] = []

    let rowNum = 0
    const pushHoldings = (list: Holding[]) => {
      list.forEach(h => {
        rowNum += 1
        rows.push(columnOrder.map(colId => getCsvCellValue(h, colId, rowNum)))
      })
    }

    if (sortedEquityHoldings.length > 0) {
      rows.push(["EQUITY"])
      pushHoldings(sortedEquityHoldings)
      rows.push([])
    }
    if (sortedDebtHoldings.length > 0) {
      rows.push(["FIXED INCOME / DEBT"])
      pushHoldings(sortedDebtHoldings)
      rows.push([])
    }
    if (sortedOtherHoldings.length > 0) {
      rows.push(["OTHERS"])
      pushHoldings(sortedOtherHoldings)
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

  const renderSectionRow = (rowNum: number, label: string) => {
    const firstColWidth = columnWidths[columnOrder[0]]
    return (
    <TableRow key={`section-${label}`} className="bg-primary/10">
      <TableCell className="sticky left-0 z-10 bg-primary/10 border-r border-border/30 px-2 py-1.5 sm:px-3 font-mono text-xs text-muted-foreground text-right align-middle" style={{ width: firstColWidth, minWidth: firstColWidth, maxWidth: firstColWidth }}>
        {rowNum}
      </TableCell>
      <TableCell colSpan={12} className="px-2 py-1.5 sm:px-3 font-bold text-sm uppercase tracking-wider text-primary whitespace-nowrap">
        {label}
      </TableCell>
    </TableRow>
    )
  }

  const renderSubtotalRow = (rowNum: number, label: string, subtotal: number, investedSubtotal: number) => {
    const allocPct = ((subtotal / total) * 100).toFixed(1)
    return (
      <TableRow key={`subtotal-${label}`} className="bg-muted/30 border-t-2 border-border">
        {columnOrder.map((colId, p) => {
          const w = columnWidths[colId]
          const stickyLeft = p === 0 ? 0 : p === 1 ? columnWidths[columnOrder[0]] : columnWidths[columnOrder[0]] + columnWidths[columnOrder[1]]
          const isSticky = p <= 2
          const stickyClass = isSticky ? "sticky z-10 bg-muted/30 border-r border-border/30" : ""
          const leftStyle = p > 0 ? { left: `${stickyLeft}px` as const } : {}
          if (colId === 0) {
            return (
              <TableCell key={colId} className={`px-2 py-2 sm:px-3 font-mono text-xs text-muted-foreground text-right align-middle ${p === 0 ? "left-0 " : ""}${stickyClass}`} style={{ width: w, minWidth: w, maxWidth: w, ...leftStyle }}>
                {rowNum}
              </TableCell>
            )
          }
          if (colId === 1) {
            return (
              <TableCell key={colId} className={`px-2 py-2 sm:px-3 font-bold text-foreground text-xs whitespace-nowrap ${stickyClass}`} style={{ width: w, minWidth: w, maxWidth: w, ...leftStyle }}>
                {label} Total
              </TableCell>
            )
          }
          if (colId === 8) {
            return (
              <TableCell key={colId} className="px-2 py-2 sm:px-3 text-right" style={{ width: w, minWidth: w, maxWidth: w }}>
                <span className="block font-bold text-foreground font-mono text-xs whitespace-nowrap truncate">₹{formatCurrency(investedSubtotal)}</span>
              </TableCell>
            )
          }
          if (colId === 9) {
            return (
              <TableCell key={colId} className="px-2 py-2 sm:px-3 text-right" style={{ width: w, minWidth: w, maxWidth: w }}>
                <span className="block font-bold text-foreground font-mono text-xs whitespace-nowrap truncate">₹{formatCurrency(subtotal)} ({allocPct}%)</span>
              </TableCell>
            )
          }
          return <TableCell key={colId} className="px-2 py-2 sm:px-3" style={{ width: w, minWidth: w, maxWidth: w }} />
        })}
      </TableRow>
    )
  }

  const getHoldingCellContent = (h: Holding, colId: number, rowNum: number): ReactNode => {
    const hasXirr = h.xirr !== null && h.xirr !== undefined
    const hasBenchmarkXirr = h.benchmark_xirr !== null && h.benchmark_xirr !== undefined
    const yearsFromEntry = formatYearsFromEntryDate(h.date_of_entry)
    const missedGains = calculateMissedGains(h)
    const isBelowBenchmark = hasXirr && hasBenchmarkXirr ? (h.xirr as number) < (h.benchmark_xirr as number) : null
    const xirrColorClass = hasXirr ? (hasBenchmarkXirr ? (isBelowBenchmark ? "text-red-500" : "text-green-500") : (h.xirr as number) < 0 ? "text-red-500" : "text-green-500") : "text-muted-foreground"
    const missedGainsColorClass = isBelowBenchmark === null ? "text-muted-foreground" : isBelowBenchmark ? "text-red-500" : "text-green-500"
    const allocPct = (((h.market_value || 0) / total) * 100).toFixed(1)
    const xirrLine = hasXirr ? `${(h.xirr as number).toFixed(1)}%` : "-"
    const bmLine = hasBenchmarkXirr ? `BM ${(h.benchmark_xirr as number).toFixed(1)}%` : ""
    const xirrBmLine = bmLine ? `${xirrLine} / ${bmLine}` : xirrLine
    const benchmarkName = getBenchmarkName(h) ?? "-"
    switch (colId) {
      case 0: return rowNum
      case 1: return <span className="block text-xs font-mono text-muted-foreground whitespace-nowrap truncate">{h.folio || "-"}</span>
      case 2: return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block font-medium text-foreground text-xs cursor-help whitespace-nowrap truncate" title={h.scheme_name}>{h.scheme_name}</span>
          </TooltipTrigger>
          <TooltipContent><p className="max-w-sm break-words">{h.scheme_name}</p></TooltipContent>
        </Tooltip>
      )
      case 3: return <span className="block text-xs text-muted-foreground whitespace-nowrap truncate">{h.sub_category}</span>
      case 4: return <span className="block text-xs text-muted-foreground whitespace-nowrap truncate">{h.style_category || "-"}</span>
      case 5: return <span className="block text-xs text-muted-foreground whitespace-nowrap truncate">{benchmarkName}</span>
      case 6: return <span className="block text-xs font-mono text-muted-foreground whitespace-nowrap truncate">{h.date_of_entry || "-"}</span>
      case 7: return <span className="block text-xs font-mono text-muted-foreground whitespace-nowrap truncate">{yearsFromEntry ?? "-"}</span>
      case 8: return <span className="block font-bold text-foreground font-mono text-xs whitespace-nowrap truncate">₹{formatCurrency(h.cost_value || 0)}</span>
      case 9: return <span className="block font-bold text-foreground font-mono text-xs whitespace-nowrap truncate">₹{formatCurrency(h.market_value || 0)} ({allocPct}%)</span>
      case 10: return <span className={`font-bold font-mono text-xs whitespace-nowrap truncate ${(h.gain_loss ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>{h.return_pct ?? 0}%</span>
      case 11: return <span className={`block font-bold font-mono text-xs whitespace-nowrap truncate ${missedGainsColorClass}`}>{missedGains !== null ? `₹${formatCurrency(missedGains)}` : "-"}</span>
      case 12: return <span className={`block font-bold font-mono text-xs whitespace-nowrap truncate ${xirrColorClass}`}>{xirrBmLine}</span>
      default: return null
    }
  }

  const renderHoldingRow = (h: Holding, rowKey: string, rowNum: number) => (
    <TableRow key={rowKey} className="hover:bg-muted/50">
      {columnOrder.map((colId, p) => {
        const w = columnWidths[colId]
        const stickyLeft = p === 0 ? 0 : p === 1 ? columnWidths[columnOrder[0]] : columnWidths[columnOrder[0]] + columnWidths[columnOrder[1]]
        const isSticky = p <= 2
        const stickyClass = isSticky ? "sticky z-10 bg-card border-r border-border/30" : ""
        const leftStyle = p > 0 ? { left: `${stickyLeft}px` as const } : {}
        const alignRight = COLUMNS[colId].align === "right"
        return (
          <TableCell
            key={colId}
            className={`px-2 py-2 sm:px-3 align-middle overflow-hidden ${p === 0 ? "left-0 font-mono text-xs text-muted-foreground " : ""}${stickyClass} ${alignRight ? "text-right" : ""}`}
            style={{ width: w, minWidth: w, maxWidth: w, ...leftStyle }}
          >
            {getHoldingCellContent(h, colId, rowNum)}
          </TableCell>
        )
      })}
    </TableRow>
  )

  return (
    <div className="mt-12 pt-12 border-t border-border">
      <div className="flex items-center justify-between gap-2 mb-6">
        <h3 className="font-bold text-xl text-foreground">
          Proposed Allocation
        </h3>
        <SectionInfoTooltip
          title="Proposed Allocation"
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
      <WideCard className="min-w-0">
        {/* Row 1: Search + Download */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by fund name, category, style, or folio number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Button
            onClick={handleDownloadCSV}
            variant="outline"
            size="default"
            className="flex shrink-0 items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
        </div>
        {/* Row 2: Filters */}
        <div className="mb-4 flex min-w-0 max-w-full flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="filter-category">Category</label>
          <select
            id="filter-category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 min-w-0 max-w-[180px] shrink rounded-none border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            className="h-9 min-w-0 max-w-[180px] shrink rounded-none border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            className="h-9 min-w-0 max-w-[180px] shrink rounded-none border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Filter by style"
          >
            <option value="">All styles</option>
            {filterOptions.styles.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {/* Table: Clay-style toolbar with column/row count */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-xs text-muted-foreground font-medium tabular-nums">
            {columnWidths.length} columns · {tableRows.length} rows
          </span>
          <span className="text-xs text-muted-foreground">
            Drag the grip to reorder columns; drag column border to resize. Scroll to see all columns.
          </span>
        </div>
        <div className="min-w-0 -mx-5 sm:-mx-6 w-full">
          <div
            className="rounded border border-border/30 scroll-smooth touch-pan-x overflow-auto min-h-[320px]"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              height: "calc(100vh - 240px)",
              minHeight: 320,
            }}
            aria-label="Detailed holdings; scroll horizontally and vertically to see all columns"
          >
            <table className="caption-bottom text-sm table-fixed" style={{ width: columnWidths.reduce((a, b) => a + b, 0), minWidth: columnWidths.reduce((a, b) => a + b, 0) }}>
              <colgroup>
                {columnOrder.map((colId) => (
                  <col key={colId} style={{ width: columnWidths[colId], minWidth: MIN_COL_WIDTHS[colId] }} />
                ))}
              </colgroup>
              <TableHeader>
                  <TableRow className="bg-muted border-b border-border">
                    {columnOrder.map((colId, p) => {
                      const col = COLUMNS[colId]
                      const w = columnWidths[colId]
                      const stickyLeft = p === 0 ? 0 : p === 1 ? columnWidths[columnOrder[0]] : columnWidths[columnOrder[0]] + columnWidths[columnOrder[1]]
                      return (
                      <TableHead
                        key={col.key ?? "row-num"}
                        data-position={p}
                        className={`relative sticky top-0 z-20 bg-muted text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider p-0 whitespace-nowrap overflow-hidden ${p <= 2 ? "sticky border-r border-border/50 z-30" : ""} ${p === 0 ? "left-0" : ""} ${col.align === "right" ? "text-right" : ""} ${draggedColPosition === p ? "opacity-60" : ""}`}
                        style={{ width: w, minWidth: w, maxWidth: w, ...(p > 0 ? { left: `${stickyLeft}px` } : {}) }}
                        onDragOver={handleColumnDragOver}
                        onDrop={(e) => handleColumnDrop(p, e)}
                        onDragEnd={handleColumnDragEnd}
                      >
                        <span
                          draggable
                          onDragStart={(e) => handleColumnDragStart(p, e)}
                          className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0 z-10"
                          aria-label="Drag to reorder column"
                        >
                          <GripVertical className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        {col.key != null ? (
                          <button type="button" onClick={() => handleSort(col.key!)} className={`flex w-full min-w-0 items-center gap-1 py-2.5 pl-6 pr-2 sm:pl-7 sm:pr-3 text-left hover:bg-muted/80 transition-colors whitespace-nowrap truncate overflow-hidden ${col.align === "right" ? "justify-end" : ""}`} aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                            {col.label}
                            {sortKey === col.key && (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
                          </button>
                        ) : (
                          <span className="block min-w-0 py-2.5 pl-6 pr-2 sm:pl-7 sm:px-3 text-muted-foreground font-semibold truncate overflow-hidden">{col.label}</span>
                        )}
                        <button type="button" aria-label={`Resize column`} className="absolute top-0 bottom-0 right-0 w-2 flex items-center justify-center cursor-col-resize border-l border-border/60 hover:border-primary/50 hover:bg-muted transition-colors group" style={{ touchAction: "none" }} onMouseDown={(e) => handleResizeStart(p, e)}>
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground shrink-0" aria-hidden />
                        </button>
                      </TableHead>
                    )})}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map((row, index) => {
                    const rowNum = index + 1
                    if (row.type === "section") return renderSectionRow(rowNum, row.label)
                    if (row.type === "subtotal") return renderSubtotalRow(rowNum, row.label, row.subtotal, row.investedSubtotal)
                    return renderHoldingRow(row.holding, row.key, rowNum)
                  })}
              </TableBody>
            </table>
          </div>
        </div>
      </WideCard>
    </div>
  )
})
