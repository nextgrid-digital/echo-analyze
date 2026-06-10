import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AnalysisSummary } from "@/types/api"

interface AllocationTargetTableProps {
  summary: AnalysisSummary
}

export function AllocationTargetTable({ summary }: AllocationTargetTableProps) {
  const rows = useMemo(() => {
    const guidelines = summary.guidelines?.investment_guidelines
    if (!guidelines) return null
    return guidelines.asset_allocation.map((item) => ({
      label: item.label,
      current: item.current,
      target: item.recommended,
      gap: item.current - item.recommended,
    }))
  }, [summary])

  if (!rows?.length) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Asset Allocation vs Target</CardTitle>
          <CardDescription>No guideline targets available for this report</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Asset Allocation vs Target</CardTitle>
        <CardDescription>Current vs recommended allocation</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset class</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Gap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right">{formatPercent(row.current)}</TableCell>
                <TableCell className="text-right">{formatPercent(row.target)}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    row.gap > 2 && "text-rose-600",
                    row.gap < -2 && "text-blue-600",
                    Math.abs(row.gap) <= 2 && "text-emerald-600"
                  )}
                >
                  {row.gap >= 0 ? "+" : ""}
                  {formatPercent(row.gap)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
