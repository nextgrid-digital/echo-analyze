import { memo, useMemo, useState, type KeyboardEvent, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Search, MoreHorizontal, ArrowUp, ArrowDown } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Holding } from "@/types/api"
import { buildFundDetailPath, buildHoldingKey } from "@/lib/holdings/holdingKey"
import { HoldingsTableHeaderFilter } from "./holdings/HoldingsTableHeaderFilter"
import {
  buildTableRows,
  calculateMissedGains,
  countActiveFilters,
  countHoldingRows,
  downloadHoldingsCsv,
  filterHoldingsByColumnFilters,
  filterHoldingsBySearch,
  formatSignedRupees,
  formatYearsFromEntryDate,
  getBenchmarkName,
  getDisplayedMissedGains,
  getFilterOptions,
  getMissedGainsColorClass,
  getVisibleColumns,
  groupHoldingsByCategory,
  sortHoldingsGroups,
  type HoldingsColumnDef,
  type HoldingsColumnId,
  type HoldingsSortKey,
} from "./holdings/holdingsTableUtils"

interface HoldingsTableProps {
  holdings: Holding[]
  totalMarketValue: number
  variant?: "workspace" | "embedded"
  defaultShowDetails?: boolean
  defaultShowFolio?: boolean
}

export const HoldingsTable = memo(function HoldingsTable({
  holdings,
  totalMarketValue,
  variant = "workspace",
  defaultShowDetails = false,
  defaultShowFolio = false,
}: HoldingsTableProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<HoldingsSortKey | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [filterSubCategories, setFilterSubCategories] = useState<string[]>([])
  const [filterStyles, setFilterStyles] = useState<string[]>([])
  const [showDetails, setShowDetails] = useState(defaultShowDetails)
  const [showFolio, setShowFolio] = useState(defaultShowFolio)
  const [renderNowMs] = useState(() => Date.now())

  const total = totalMarketValue || 1
  const visibleColumns = useMemo(
    () => getVisibleColumns(showDetails, showFolio),
    [showDetails, showFolio]
  )
  const filterOptions = useMemo(() => getFilterOptions(holdings), [holdings])

  const filteredHoldings = useMemo(() => {
    const byColumns = filterHoldingsByColumnFilters(holdings, {
      categories: filterCategories,
      subCategories: filterSubCategories,
      styles: filterStyles,
    })
    return filterHoldingsBySearch(byColumns, searchQuery)
  }, [holdings, filterCategories, filterSubCategories, filterStyles, searchQuery])

  const grouped = useMemo(() => groupHoldingsByCategory(filteredHoldings), [filteredHoldings])
  const sorted = useMemo(
    () => sortHoldingsGroups(grouped, sortKey, sortDir, renderNowMs),
    [grouped, sortKey, sortDir, renderNowMs]
  )
  const tableRows = useMemo(() => buildTableRows(sorted, grouped), [sorted, grouped])
  const holdingCount = countHoldingRows(tableRows)
  const activeFilterCount = countActiveFilters({
    categories: filterCategories,
    subCategories: filterSubCategories,
    styles: filterStyles,
    searchQuery,
  })

  const handleSort = (key: HoldingsSortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const navigateToFund = (holding: Holding) => {
    navigate(buildFundDetailPath(buildHoldingKey(holding)))
  }

  const handleHoldingRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, holding: Holding) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      navigateToFund(holding)
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setFilterCategories([])
    setFilterSubCategories([])
    setFilterStyles([])
  }

  const renderSortButton = (col: HoldingsColumnDef) => {
    if (!col.key) return col.label
    const isActive = sortKey === col.key
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "-ml-2 h-8 px-2 font-medium hover:bg-transparent",
          col.align === "right" && "ml-auto -mr-2"
        )}
        onClick={() => handleSort(col.key!)}
        aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
      >
        {col.label}
        {isActive &&
          (sortDir === "asc" ? (
            <ArrowUp className="ml-1 size-3.5" aria-hidden />
          ) : (
            <ArrowDown className="ml-1 size-3.5" aria-hidden />
          ))}
      </Button>
    )
  }

  const renderColumnHeader = (col: HoldingsColumnDef) => {
    if (col.id === "scheme_name") {
      return (
        <HoldingsTableHeaderFilter
          column={col}
          options={filterOptions.categories}
          value={filterCategories}
          onValueChange={setFilterCategories}
          filterLabel="Category"
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )
    }
    if (col.id === "sub_category") {
      return (
        <HoldingsTableHeaderFilter
          column={col}
          options={filterOptions.subCategories}
          value={filterSubCategories}
          onValueChange={setFilterSubCategories}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )
    }
    if (col.id === "style_category") {
      return (
        <HoldingsTableHeaderFilter
          column={col}
          options={filterOptions.styles}
          value={filterStyles}
          onValueChange={setFilterStyles}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )
    }
    return renderSortButton(col)
  }

  const renderHoldingCell = (h: Holding, columnId: HoldingsColumnId): ReactNode => {
    const hasXirr = h.xirr !== null && h.xirr !== undefined
    const hasBenchmarkXirr = h.benchmark_xirr !== null && h.benchmark_xirr !== undefined
    const yearsFromEntry = formatYearsFromEntryDate(h.date_of_entry, renderNowMs)
    const displayedMissedGains = getDisplayedMissedGains(calculateMissedGains(h))
    const isBelowBenchmark =
      hasXirr && hasBenchmarkXirr ? (h.xirr as number) < (h.benchmark_xirr as number) : null
    const xirrColorClass = hasXirr
      ? hasBenchmarkXirr
        ? isBelowBenchmark
          ? "text-red-500"
          : "text-green-500"
        : (h.xirr as number) < 0
          ? "text-red-500"
          : "text-green-500"
      : "text-muted-foreground"
    const missedGainsColorClass = getMissedGainsColorClass(displayedMissedGains)
    const allocPct = (((h.market_value || 0) / total) * 100).toFixed(1)
    const benchmarkName = getBenchmarkName(h)

    switch (columnId) {
      case "folio":
        return <span className="font-mono text-muted-foreground">{h.folio || "-"}</span>
      case "scheme_name":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[240px] truncate font-medium text-primary group-hover:underline">
                {h.scheme_name}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-sm break-words">{h.scheme_name}</p>
            </TooltipContent>
          </Tooltip>
        )
      case "sub_category":
        return <span className="text-muted-foreground">{h.sub_category}</span>
      case "style_category":
        return <span className="text-muted-foreground">{h.style_category || "-"}</span>
      case "benchmark":
        return <span className="max-w-[120px] truncate text-muted-foreground">{benchmarkName}</span>
      case "date_of_entry":
        return <span className="font-mono text-muted-foreground">{h.date_of_entry || "-"}</span>
      case "holding_period":
        return <span className="font-mono text-muted-foreground">{yearsFromEntry ?? "-"}</span>
      case "cost_value":
        return <span className="font-mono font-medium tabular-nums">Rs {formatCurrency(h.cost_value || 0)}</span>
      case "market_value":
        return <span className="font-mono font-medium tabular-nums">Rs {formatCurrency(h.market_value || 0)}</span>
      case "weight_pct":
        return <span className="font-mono font-medium tabular-nums">{allocPct}%</span>
      case "missed_gains":
        return (
          <span className={cn("font-mono font-medium tabular-nums", missedGainsColorClass)}>
            {displayedMissedGains !== null ? formatSignedRupees(displayedMissedGains) : "-"}
          </span>
        )
      case "xirr":
        return (
          <span className={cn("font-mono font-medium tabular-nums", xirrColorClass)}>
            {hasXirr ? `${(h.xirr as number).toFixed(1)}%` : "-"}
          </span>
        )
      case "benchmark_xirr":
        return (
          <span className="font-mono font-medium tabular-nums text-muted-foreground">
            {hasBenchmarkXirr ? `${(h.benchmark_xirr as number).toFixed(2)}%` : "-"}
          </span>
        )
      default:
        return null
    }
  }

  const renderSubtotalCell = (
    columnId: HoldingsColumnId,
    label: string,
    subtotal: number,
    investedSubtotal: number,
    missedGainsSubtotal: number
  ): ReactNode => {
    const allocPct = ((subtotal / total) * 100).toFixed(1)
    const displayedMissedGains = getDisplayedMissedGains(missedGainsSubtotal) ?? 0
    const hasMissedGains = Math.abs(displayedMissedGains) > 0.0001

    switch (columnId) {
      case "scheme_name":
        return <span className="font-semibold">{label} total</span>
      case "cost_value":
        return <span className="font-mono font-semibold tabular-nums">Rs {formatCurrency(investedSubtotal)}</span>
      case "market_value":
        return <span className="font-mono font-semibold tabular-nums">Rs {formatCurrency(subtotal)}</span>
      case "weight_pct":
        return <span className="font-mono font-semibold tabular-nums">{allocPct}%</span>
      case "missed_gains":
        return (
          <span
            className={cn(
              "font-mono font-semibold tabular-nums",
              hasMissedGains ? getMissedGainsColorClass(displayedMissedGains) : "text-muted-foreground"
            )}
          >
            {hasMissedGains ? formatSignedRupees(displayedMissedGains) : "-"}
          </span>
        )
      default:
        return null
    }
  }

  const toolbar = (
    <div className="space-y-3 no-print">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search funds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {holdingCount} {holdingCount === 1 ? "holding" : "holdings"}
            {activeFilterCount > 0 ? ` · ${activeFilterCount} filtered` : ""}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" aria-label="Table actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => downloadHoldingsCsv(sorted, totalMarketValue, renderNowMs)}
              >
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setShowDetails((prev) => {
                    if (prev) setFilterStyles([])
                    return !prev
                  })
                }}
              >
                {showDetails ? "Hide details" : "Show details"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFolio((prev) => !prev)}>
                {showFolio ? "Hide folio" : "Show folio"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetFilters}>Reset filters</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )

  const tableContent = (
    <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-border print-full-table">
      <Table className="min-w-max w-full">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {visibleColumns.map((col) => (
              <TableHead
                key={col.id}
                className={cn(
                  col.className,
                  col.align === "right" && "text-right",
                  col.id === "scheme_name" &&
                    "sticky left-0 z-10 bg-muted/50 shadow-[1px_0_0_0_hsl(var(--border))]"
                )}
              >
                {renderColumnHeader(col)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={visibleColumns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No holdings match your search or filters.
              </TableCell>
            </TableRow>
          ) : (
            tableRows.map((row) => {
              if (row.type === "section") {
                return (
                  <TableRow key={`section-${row.label}`} className="bg-primary/5 hover:bg-primary/5">
                    <TableCell colSpan={visibleColumns.length} className="font-semibold text-primary">
                      {row.label}
                    </TableCell>
                  </TableRow>
                )
              }

              if (row.type === "subtotal") {
                return (
                  <TableRow key={`subtotal-${row.label}`} className="bg-muted/30 font-medium">
                    {visibleColumns.map((col) => (
                      <TableCell
                        key={col.id}
                        className={cn(
                          col.className,
                          col.align === "right" && "text-right",
                          col.id === "scheme_name" &&
                            "sticky left-0 z-10 bg-muted/30 shadow-[1px_0_0_0_hsl(var(--border))]"
                        )}
                      >
                        {renderSubtotalCell(
                          col.id,
                          row.label,
                          row.subtotal,
                          row.investedSubtotal,
                          row.missedGainsSubtotal
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              }

              return (
                <TableRow
                  key={row.key}
                  className="group cursor-pointer hover:bg-muted/40"
                  role="link"
                  tabIndex={0}
                  aria-label={`View details for ${row.holding.scheme_name}`}
                  onClick={() => navigateToFund(row.holding)}
                  onKeyDown={(event) => handleHoldingRowKeyDown(event, row.holding)}
                >
                  {visibleColumns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        col.className,
                        col.align === "right" && "text-right",
                        col.id === "scheme_name" &&
                          "sticky left-0 z-10 bg-background group-hover:bg-muted/40 shadow-[1px_0_0_0_hsl(var(--border))]"
                      )}
                    >
                      {renderHoldingCell(row.holding, col.id)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )

  if (variant === "embedded") {
    return (
      <div className="min-w-0 space-y-4">
        {toolbar}
        {tableContent}
      </div>
    )
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Portfolio holdings</CardTitle>
          <CardDescription>
            Full holdings breakdown with performance metrics. Scroll horizontally if needed on smaller screens.
          </CardDescription>
        </div>
        <SectionInfoTooltip
          title="Portfolio holdings"
          formula={
            <>
              Value = Units x NAV
              <br />
              Allocation % = (Holding Value / Total Portfolio Value) x 100
              <br />
              Missed Gains = Portfolio Value - Benchmark Value
              <br />
              Benchmark = SEBI/AMFI Tier 1 index (or underlying index for index funds/ETFs)
            </>
          }
          content={
            <>
              Benchmarks are resolved from the AMFI scheme master and SEBI Tier 1 registry, including
              CRISIL indices for debt and hybrid funds. XIRR and missed gains simulate the same cashflows
              against index-fund NAV proxies.
            </>
          }
        />
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        {toolbar}
        {tableContent}
      </CardContent>
    </Card>
  )
})
