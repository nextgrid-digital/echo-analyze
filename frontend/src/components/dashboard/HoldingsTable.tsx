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
import { Search, Download } from "lucide-react"
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
  const total = totalMarketValue || 1

  // Filter holdings based on search query
  const filteredHoldings = useMemo(() => {
    if (!searchQuery.trim()) return holdings
    
    const query = searchQuery.toLowerCase().trim()
    return holdings.filter(h => 
      h.scheme_name.toLowerCase().includes(query) ||
      h.sub_category.toLowerCase().includes(query) ||
      h.category.toLowerCase().includes(query) ||
      (h.style_category && h.style_category.toLowerCase().includes(query))
    )
  }, [holdings, searchQuery])

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

  // CSV download handler
  const handleDownloadCSV = () => {
    const headers = [
      "Fund Name",
      "Category",
      "Sub Category",
      "Style",
      "Entry Date",
      "Invested Value (₹)",
      "Market Value (₹)",
      "Allocation (%)",
      "Absolute Returns (%)",
      "XIRR (%)",
      "Benchmark XIRR (%)",
      "Benchmark Name"
    ]

    const rows: string[][] = []

    // Add equity holdings
    if (equityHoldings.length > 0) {
      rows.push(["EQUITY"])
      equityHoldings.forEach(h => {
        const benchmarkName = getBenchmarkName(h) || ""
        rows.push([
          h.scheme_name,
          h.category,
          h.sub_category,
          h.style_category || "",
          h.date_of_entry || "",
          formatCurrency(h.cost_value || 0),
          formatCurrency(h.market_value || 0),
          (((h.market_value || 0) / total) * 100).toFixed(2),
          (h.return_pct ?? 0).toFixed(2),
          formatOptionalPercent(h.xirr),
          formatOptionalPercent(h.benchmark_xirr),
          benchmarkName
        ])
      })
      rows.push([]) // Empty row after equity
    }

    // Add debt holdings
    if (debtHoldings.length > 0) {
      rows.push(["FIXED INCOME / DEBT"])
      debtHoldings.forEach(h => {
        const benchmarkName = getBenchmarkName(h) || ""
        rows.push([
          h.scheme_name,
          h.category,
          h.sub_category,
          h.style_category || "",
          h.date_of_entry || "",
          formatCurrency(h.cost_value || 0),
          formatCurrency(h.market_value || 0),
          (((h.market_value || 0) / total) * 100).toFixed(2),
          (h.return_pct ?? 0).toFixed(2),
          formatOptionalPercent(h.xirr),
          formatOptionalPercent(h.benchmark_xirr),
          benchmarkName
        ])
      })
      rows.push([]) // Empty row after debt
    }

    // Add other holdings
    if (otherHoldings.length > 0) {
      rows.push(["OTHERS"])
      otherHoldings.forEach(h => {
        const benchmarkName = getBenchmarkName(h) || ""
        rows.push([
          h.scheme_name,
          h.category,
          h.sub_category,
          h.style_category || "",
          h.date_of_entry || "",
          formatCurrency(h.cost_value || 0),
          formatCurrency(h.market_value || 0),
          (((h.market_value || 0) / total) * 100).toFixed(2),
          (h.return_pct ?? 0).toFixed(2),
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
      <TableCell colSpan={2} className="px-4 py-3 sm:px-8 sm:py-5 font-bold text-foreground">
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
      <TableCell colSpan={2} />
    </TableRow>
  )

  const renderHoldingRow = (h: Holding, i: string | number) => {
    const benchmarkName = getBenchmarkName(h)
    const hasXirr = h.xirr !== null && h.xirr !== undefined
    const hasBenchmarkXirr = h.benchmark_xirr !== null && h.benchmark_xirr !== undefined
    return (
      <TableRow key={i} className="hover:bg-muted/50">
        <TableCell className="px-4 py-3 sm:px-8 sm:py-5 whitespace-normal max-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="font-bold text-foreground text-sm truncate flex-1 min-w-0 cursor-help">
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
          <div className={`font-bold font-mono text-sm ${hasXirr && (h.xirr as number) < 0 ? "text-red-500" : "text-green-500"
            }`}>
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
      <WideCard className="overflow-hidden">
        {/* Search Input and Download Button */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by fund name, category, or style..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full max-w-md"
            />
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
        <div className="w-full overflow-hidden">
          <div className="relative w-full overflow-hidden">
            <table className="w-full caption-bottom text-sm table-fixed">
              <TableHeader>
                <TableRow className="bg-muted border-b border-border">
                  <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 w-[25%]">
                    Fund Name / Category
                  </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 w-[12%]">
                    Entry Date
                  </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right w-[15%]">
                    Invested Value
                  </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right w-[15%]">
                    Current Value
                  </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right w-[12%]">
                    Abs Returns
                  </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right w-[21%]">
                    XIRR / BM
                  </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equityHoldings.length > 0 && (
                <>
                  <TableRow className="bg-primary/10">
                    <TableCell colSpan={6} className="px-4 py-2 sm:px-8 sm:py-3 font-bold text-sm uppercase tracking-wider text-primary">
                      Equity
                    </TableCell>
                  </TableRow>
                  {equityHoldings.map((h, i) => renderHoldingRow(h, `eq-${i}`))}
                  {renderSubtotalRow("Equity", equityTotal, equityInvestedTotal)}
                </>
              )}

              {debtHoldings.length > 0 && (
                <>
                  <TableRow className="bg-primary/10">
                    <TableCell colSpan={6} className="px-4 py-2 sm:px-8 sm:py-3 font-bold text-sm uppercase tracking-wider text-primary">
                      Fixed Income / Debt
                    </TableCell>
                  </TableRow>
                  {debtHoldings.map((h, i) => renderHoldingRow(h, `debt-${i}`))}
                  {renderSubtotalRow("Debt", debtTotal, debtInvestedTotal)}
                </>
              )}

              {otherHoldings.length > 0 && (
                <>
                  <TableRow className="bg-primary/10">
                    <TableCell colSpan={6} className="px-4 py-2 sm:px-8 sm:py-3 font-bold text-sm uppercase tracking-wider text-primary">
                      Others
                    </TableCell>
                  </TableRow>
                  {otherHoldings.map((h, i) => renderHoldingRow(h, `other-${i}`))}
                  {renderSubtotalRow("Others", otherTotal, otherInvestedTotal)}
                </>
              )}
            </TableBody>
            </table>
          </div>
        </div>
      </WideCard>
    </div>
  )
})
