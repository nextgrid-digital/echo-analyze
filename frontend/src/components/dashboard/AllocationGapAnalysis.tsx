import { memo, useMemo } from "react"
import { WideCard } from "./cards/WideCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatPercent } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

interface AllocationGapAnalysisProps {
  summary: AnalysisSummary
}

function AllocationGapAnalysisInner({ summary }: AllocationGapAnalysisProps) {
  const gapData = useMemo(() => {
    const guidelines = summary.guidelines?.investment_guidelines
    if (!guidelines) return null

    const gaps = guidelines.asset_allocation.map((item) => {
      const current = item.current
      const target = item.recommended
      const gap = current - target
      const gapPct = gap

      return {
        label: item.label,
        current,
        target,
        gap,
        gapPct,
        status:
          Math.abs(gap) <= 2
            ? "within"
            : gap > 5
            ? "above"
            : gap < -5
            ? "below"
            : "slightly-off",
      }
    })

    return gaps
  }, [summary])

  if (!gapData) {
    return null
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "within":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Within Target
          </Badge>
        )
      case "above":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            Above Target
          </Badge>
        )
      case "below":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Below Target
          </Badge>
        )
      default:
        return (
          <Badge className="bg-muted text-muted-foreground">
            Slightly Off
          </Badge>
        )
    }
  }

  return (
    <WideCard>
      <div className="relative">
        <div className="absolute top-0 right-0">
          <SectionInfoTooltip
            title="Allocation Gap Analysis"
            formula={
              <>
                Current % = (Category Value ÷ Total Portfolio Value) × 100<br />
                Target % = Recommended allocation from guidelines<br />
                Gap % = Current % − Target %<br />
                Gap Value = (Gap % ÷ 100) × Total Portfolio Value
              </>
            }
            content={
              <>
                Comparison of current asset allocation against target allocation from investment guidelines. Gaps show deviations from recommended allocation. Positive gap = above target, negative gap = below target.
              </>
            }
          />
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-6">
          Allocation Gap Analysis
        </h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Class</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Gap</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gapData.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPercent(item.current)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatPercent(item.target)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      item.gap > 0
                        ? "text-amber-600"
                        : item.gap < 0
                        ? "text-blue-600"
                        : "text-foreground"
                    }`}
                  >
                    {item.gap > 0 ? "+" : ""}
                    {formatPercent(item.gap)}
                  </TableCell>
                  <TableCell className="text-right">
                    {getStatusBadge(item.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </WideCard>
  )
}

export const AllocationGapAnalysis = memo(AllocationGapAnalysisInner)
