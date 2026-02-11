import { memo, useMemo } from "react"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import type { Holding } from "@/types/api"

interface HoldingsTableProps {
  holdings: Holding[]
  totalMarketValue: number
}

export const HoldingsTable = memo(function HoldingsTable({
  holdings,
  totalMarketValue,
}: HoldingsTableProps) {
  const total = totalMarketValue || 1

  // Group holdings by category
  const { equityHoldings, debtHoldings, otherHoldings, equityTotal, debtTotal, otherTotal } = useMemo(() => {
    const equity: Holding[] = []
    const debt: Holding[] = []
    const other: Holding[] = []
    let eqTotal = 0
    let dbTotal = 0
    let otTotal = 0

    holdings.forEach(h => {
      if (h.category === "Equity") {
        equity.push(h)
        eqTotal += h.market_value
      } else if (h.category === "Fixed Income") {
        debt.push(h)
        dbTotal += h.market_value
      } else {
        other.push(h)
        otTotal += h.market_value
      }
    })

    return {
      equityHoldings: equity,
      debtHoldings: debt,
      otherHoldings: other,
      equityTotal: eqTotal,
      debtTotal: dbTotal,
      otherTotal: otTotal
    }
  }, [holdings])

  const renderSubtotalRow = (label: string, subtotal: number) => (
    <TableRow className="bg-muted/30 border-t-2 border-border">
      <TableCell colSpan={2} className="px-4 py-3 sm:px-8 sm:py-5 font-bold text-foreground">
        {label} Total
      </TableCell>
      <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
        <div className="font-bold text-foreground font-mono text-base">
          {(subtotal / 100_000).toFixed(2)}
        </div>
        <div className="text-[10px] text-muted-foreground font-bold font-mono">
          {((subtotal / total) * 100).toFixed(1)}%
        </div>
      </TableCell>
      <TableCell colSpan={2} />
    </TableRow>
  )

  const renderHoldingRow = (h: Holding, i: string | number) => (
    <TableRow key={i} className="hover:bg-muted/50">
      <TableCell className="px-4 py-3 sm:px-8 sm:py-5">
        <div className="flex items-center gap-2">
          <div className="font-bold text-foreground text-sm">
            {h.scheme_name}
          </div>
          {h.style_category && (
            <Badge variant="secondary" className="text-[10px] uppercase">
              {h.style_category}
            </Badge>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
          {h.sub_category}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3 sm:px-8 sm:py-5">
        <div className="text-xs font-mono text-muted-foreground">
          {h.date_of_entry || "-"}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
        <div className="font-bold text-foreground font-mono">
          {(h.market_value / 100_000).toFixed(2)}
        </div>
        <div className="text-[10px] text-muted-foreground font-bold font-mono">
          {((h.market_value / total) * 100).toFixed(1)}%
        </div>
      </TableCell>
      <TableCell
        className={`px-4 py-3 sm:px-8 sm:py-5 text-right font-bold font-mono ${(h.gain_loss ?? 0) >= 0 ? "text-primary" : "text-destructive"
          }`}
      >
        {h.return_pct ?? 0}%
      </TableCell>
      <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
        <div className={`font-bold font-mono text-sm ${(h.xirr ?? 0) >= 0 ? "text-green-500" : "text-red-500"
          }`}>
          {h.xirr ? h.xirr.toFixed(1) + "%" : "-"}
        </div>
        <div className="text-[10px] text-muted-foreground font-bold font-mono">
          BM: {h.benchmark_xirr ? h.benchmark_xirr.toFixed(1) + "%" : "-"}
        </div>
      </TableCell>
    </TableRow>
  )

  return (
    <div className="mt-12 pt-12 border-t border-border">
      <div className="flex items-center justify-between gap-2 mb-6">
        <h3 className="font-bold text-xl text-foreground">
          Full Holding List
        </h3>
        <SectionInfoTooltip
          title="Full Holding List"
          content={
            <>
              All holdings from your statement: scheme name, category, market value
              (in Lakhs), allocation % of portfolio, return %, and style (e.g.
              Growth). Value = units × NAV; allocation = holding value ÷ total
              portfolio × 100; return = gain/loss % on cost. Holdings are grouped by Equity and Debt with subtotals.
            </>
          }
        />
      </div>
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted border-b border-border">
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5">
                  Fund Name / Category
                </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5">
                  Entry Date
                </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right">
                  Value (Lakhs) / Allocation
                </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right">
                  Abs Returns
                </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right">
                  XIRR / BM
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equityHoldings.length > 0 && (
                <>
                  <TableRow className="bg-primary/10">
                    <TableCell colSpan={5} className="px-4 py-2 sm:px-8 sm:py-3 font-bold text-sm uppercase tracking-wider text-primary">
                      Equity
                    </TableCell>
                  </TableRow>
                  {equityHoldings.map((h, i) => renderHoldingRow(h, `eq-${i}`))}
                  {renderSubtotalRow("Equity", equityTotal)}
                </>
              )}

              {debtHoldings.length > 0 && (
                <>
                  <TableRow className="bg-primary/10">
                    <TableCell colSpan={5} className="px-4 py-2 sm:px-8 sm:py-3 font-bold text-sm uppercase tracking-wider text-primary">
                      Fixed Income / Debt
                    </TableCell>
                  </TableRow>
                  {debtHoldings.map((h, i) => renderHoldingRow(h, `debt-${i}`))}
                  {renderSubtotalRow("Debt", debtTotal)}
                </>
              )}

              {otherHoldings.length > 0 && (
                <>
                  <TableRow className="bg-primary/10">
                    <TableCell colSpan={5} className="px-4 py-2 sm:px-8 sm:py-3 font-bold text-sm uppercase tracking-wider text-primary">
                      Others
                    </TableCell>
                  </TableRow>
                  {otherHoldings.map((h, i) => renderHoldingRow(h, `other-${i}`))}
                  {renderSubtotalRow("Others", otherTotal)}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
})
