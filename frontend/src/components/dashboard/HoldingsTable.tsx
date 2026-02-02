import { memo } from "react"
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
  return (
    <div className="mt-12 pt-12 border-t border-slate-200">
      <div className="flex items-center justify-between gap-2 mb-6">
        <h3 className="font-bold text-xl text-slate-800">
          Full Holding List
        </h3>
        <SectionInfoTooltip
          title="Full Holding List"
          content={
            <>
              All holdings from your statement: scheme name, category, market value
              (in Lakhs), allocation % of portfolio, return %, and style (e.g.
              Growth). Value = units × NAV; allocation = holding value ÷ total
              portfolio × 100; return = gain/loss % on cost.
            </>
          }
        />
      </div>
      <Card className="border-slate-100 overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-100">
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5">
                  Fund Name / Category
                </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right">
                  Value (Lakhs) / Allocation
                </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-right">
                  Returns
                </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 sm:px-8 sm:py-5 text-center">
                  Type
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h, i) => (
                <TableRow key={i} className="hover:bg-slate-50">
                  <TableCell className="px-4 py-3 sm:px-8 sm:py-5">
                    <div className="font-bold text-slate-800 text-sm">
                      {h.scheme_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {h.sub_category}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-right">
                    <div className="font-bold text-slate-700">
                      {(h.market_value / 100_000).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold">
                      {((h.market_value / total) * 100).toFixed(1)}%
                    </div>
                  </TableCell>
                  <TableCell
                    className={`px-4 py-3 sm:px-8 sm:py-5 text-right font-bold ${
                      (h.gain_loss ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {h.return_pct ?? 0}%
                  </TableCell>
                  <TableCell className="px-4 py-3 sm:px-8 sm:py-5 text-center">
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {h.style_category ?? "N/A"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
})
