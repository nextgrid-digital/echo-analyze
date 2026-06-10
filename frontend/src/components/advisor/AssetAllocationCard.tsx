import { useMemo } from "react"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { AssetAllocationBreakdownChart } from "@/components/dashboard/visualizations/AssetAllocationBreakdownChart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buildAssetAllocationData } from "@/lib/assetAllocationData"
import type { AnalysisSummary, Holding } from "@/types/api"

interface AssetAllocationCardProps {
  summary: AnalysisSummary
  holdings: Holding[]
}

export function AssetAllocationCard({ summary, holdings }: AssetAllocationCardProps) {
  const { tableData, othersBreakdown, otherFunds } = useMemo(
    () => buildAssetAllocationData(summary, holdings),
    [summary, holdings]
  )

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Asset Allocation</CardTitle>
            <CardDescription>
              Equity, debt, liquidity, and others by market value
            </CardDescription>
          </div>
          <SectionInfoTooltip
            title="Asset Allocation"
            formula={<>Allocation % = (Category Value / Total Portfolio Value) * 100</>}
            content={
              <>
                Equity = categories containing Equity, Cap, or ELSS; Fixed Income = Liquid or Debt; rest = Others.
              </>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        <AssetAllocationBreakdownChart
          tableData={tableData}
          othersBreakdown={othersBreakdown}
          otherFunds={otherFunds}
        />
      </CardContent>
    </Card>
  )
}
