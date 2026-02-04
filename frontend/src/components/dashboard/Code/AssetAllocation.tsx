import { memo, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { CHART_COLORS_3 } from "@/lib/chartColors"
import type { AnalysisSummary, AssetAllocation as AssetAlloc } from "@/types/api"

interface AssetAllocationProps {
  summary: AnalysisSummary
}

function AssetAllocationInner({ summary }: AssetAllocationProps) {
  const { tableData, pieData, equityPct } = useMemo(() => {
    const alloc: AssetAlloc[] = summary.asset_allocation ?? []
    let equity = 0,
      debt = 0,
      others = 0
    alloc.forEach((a) => {
      const cat = (a.category ?? "").toUpperCase()
      if (cat.includes("LIQUID") || cat.includes("DEBT")) debt += a.value
      else if (
        cat.includes("EQUITY") ||
        cat.includes("CAP") ||
        cat.includes("ELSS")
      )
        equity += a.value
      else others += a.value
    })
    const total = equity + debt + others || 1
    const pieData = [
      { name: "Equity", value: equity, color: CHART_COLORS_3[0] },
      { name: "Fixed Income", value: debt, color: CHART_COLORS_3[1] },
      { name: "Others", value: others, color: CHART_COLORS_3[2] },
    ].filter((d) => d.value > 0)
    return {
      tableData: alloc,
      pieData,
      equityPct: ((equity / total) * 100).toFixed(1),
    }
  }, [summary.asset_allocation])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
      <Card className="border-border">
        <CardContent className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center relative">
          <div className="absolute top-4 right-4">
            <SectionInfoTooltip
              title="Asset Allocation (Pie)"
              content={
                <>
                  Equity = categories containing &quot;Equity&quot;, &quot;Cap&quot;, or
                  &quot;ELSS&quot;; Fixed Income = &quot;Liquid&quot; or &quot;Debt&quot;; rest
                  = Others. Values are market value; center shows equity % of total.
                </>
              }
            />
          </div>
          <h3 className="w-full text-left font-bold text-base sm:text-lg text-foreground mb-4 sm:mb-6">
            Asset Allocation
          </h3>
          <div className="size-48 sm:size-64 relative max-w-full">
            {pieData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number | undefined) => v != null ? `${(v / (pieData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1)}%` : ""} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="block text-2xl font-bold text-foreground font-mono">
                  {equityPct}%
                </span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Equity
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-2 border-border">
        <CardContent className="p-4 sm:p-6 lg:p-8 relative">
          <div className="absolute top-4 right-4">
            <SectionInfoTooltip
              title="Asset Allocation Details"
              content={
                <>
                  Each row is a scheme category (e.g. Large Cap, Liquid). Value =
                  market value in Lakhs; Allocation = that category&apos;s share of
                  total portfolio × 100.
                </>
              }
            />
          </div>
          <h3 className="font-bold text-base sm:text-lg text-foreground mb-4 sm:mb-6">
            Asset Allocation Details
          </h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted border-b border-border">
                <TableHead className="text-[10px] uppercase rounded-l-xl">
                  Category
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase">
                  Value (Lakhs)
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase rounded-r-xl">
                  Allocation
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((item, i) => (
                <TableRow key={i} className="hover:bg-muted/50">
                  <TableCell className="font-bold text-foreground">
                    {item.category}
                  </TableCell>
                  <TableCell className="text-right font-medium text-muted-foreground font-mono">
                    {(item.value / 100_000).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground font-mono">
                    {item.allocation_pct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const AssetAllocation = memo(AssetAllocationInner)
