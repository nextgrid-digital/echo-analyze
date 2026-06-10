import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { ProgressBarWithLabel } from "@/components/dashboard/visualizations/ProgressBarWithLabel"
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
import type { ConcentrationData } from "@/types/api"

interface ConcentrationDetailCardProps {
  concentration: ConcentrationData
}

export function ConcentrationDetailCard({ concentration }: ConcentrationDetailCardProps) {
  const fundStatusColor = concentration.fund_status.toLowerCase().includes("healthy")
    ? "#059669"
    : "#f59e0b"
  const amcStatusColor = concentration.amc_status.toLowerCase().includes("healthy")
    ? "#059669"
    : "#f59e0b"

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Fund Concentration</CardTitle>
              <CardDescription>
                Top holdings by value. Recommended fund count: 7–10.
              </CardDescription>
            </div>
            <SectionInfoTooltip
              title="Your Funds"
              formula={<>Allocation % = (Fund Value / Total Portfolio Value) x 100</>}
              content={
                <>
                  Number of distinct schemes in your portfolio. Top funds sorted by market value.
                </>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-2xl font-semibold tabular-nums">{concentration.fund_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recommended</p>
              <p className="text-xl font-semibold text-muted-foreground tabular-nums">7–10</p>
            </div>
          </div>
          <ProgressBarWithLabel
            value={concentration.fund_count}
            max={10}
            label="Fund Count"
            valueLabel={`${concentration.fund_count} / 10`}
            color={fundStatusColor}
            height="lg"
            showValue={false}
          />
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-[50%]">Top Funds</TableHead>
                  <TableHead className="text-right">Value (Lakhs)</TableHead>
                  <TableHead className="text-right">Allocation %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(concentration.top_funds ?? []).map((fund) => (
                  <TableRow key={fund.name} className="hover:bg-muted/50">
                    <TableCell className="max-w-0 font-medium">
                      <div className="truncate" title={fund.name}>
                        {fund.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {(fund.value / 100_000).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {fund.allocation_pct}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">AMC Concentration</CardTitle>
              <CardDescription>Recommended AMC count: 5–7</CardDescription>
            </div>
            <SectionInfoTooltip
              title="Your AMCs"
              formula={<>AMC Allocation % = (AMC Total Value / Total Portfolio Value) x 100</>}
              content={
                <>
                  Number of asset management companies you invest with and their allocation share.
                </>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current</span>
            <span className="text-xl font-semibold tabular-nums">{concentration.amc_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Recommended</span>
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">5–7</span>
          </div>
          <ProgressBarWithLabel
            value={concentration.amc_count}
            max={7}
            label=""
            valueLabel=""
            color={amcStatusColor}
            height="md"
            showValue={false}
          />
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>AMC</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(concentration.top_amcs ?? []).slice(0, 5).map((amc) => (
                <TableRow key={amc.name} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{amc.name}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {amc.allocation_pct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
