import { memo } from "react"
import { WideCard } from "./cards/WideCard"
import { NarrowCard } from "./cards/NarrowCard"
import { TwoColumnLayout } from "./layouts/TwoColumnLayout"
import { ProgressBarWithLabel } from "./visualizations/ProgressBarWithLabel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import type { ConcentrationData } from "@/types/api"

interface ConcentrationProps {
  concentration: ConcentrationData
}

function ConcentrationInner({ concentration }: ConcentrationProps) {
  const con = concentration
  const fundStatusColor = con.fund_status.toLowerCase().includes("healthy") ? "#059669" : "#f59e0b"
  const amcStatusColor = con.amc_status.toLowerCase().includes("healthy") ? "#059669" : "#f59e0b"

  return (
    <div className="mb-6 sm:mb-8">
      <TwoColumnLayout
        leftWidth="2/3"
        rightWidth="1/3"
        left={
          <WideCard>
            <div className="relative">
              <div className="absolute top-0 right-0">
                <SectionInfoTooltip
                  title="Your Funds"
                  formula={
                    <>
                      Allocation % = (Fund Value ÷ Total Portfolio Value) × 100
                    </>
                  }
                  content={
                    <>
                      Number of distinct schemes (funds) in your portfolio. Status is &quot;healthy&quot; when count is in the recommended range (7–10). Top funds are sorted by market value.
                    </>
                  }
                />
              </div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg text-foreground">Your Funds</h3>
              </div>

              {/* Horizontal bar showing current vs recommended */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current</p>
                      <p className="text-2xl font-bold text-foreground font-mono">{con.fund_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Recommended</p>
                      <p className="text-xl font-semibold text-muted-foreground font-mono">7-10</p>
                    </div>
                  </div>
                </div>
                <ProgressBarWithLabel
                  value={con.fund_count}
                  max={10}
                  label="Fund Count"
                  valueLabel={`${con.fund_count} / 10`}
                  color={fundStatusColor}
                  height="lg"
                  showValue={false}
                />
              </div>

              {/* Top Funds Table */}
              <div className="w-full overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-[10px] uppercase w-[50%]">
                        Top Funds
                      </TableHead>
                      <TableHead className="text-right text-[10px] uppercase w-[25%]">
                        Value (Lakhs)
                      </TableHead>
                      <TableHead className="text-right text-[10px] uppercase w-[25%]">
                        Allocation %
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(con.top_funds ?? []).map((f, i) => (
                      <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-foreground max-w-0">
                          <div className="truncate" title={f.name}>
                            {f.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground font-bold font-mono whitespace-nowrap">
                          {(f.value / 100_000).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground font-mono whitespace-nowrap">
                          {f.allocation_pct}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </WideCard>
        }
        right={
          <NarrowCard>
            <div className="relative">
              <div className="absolute top-0 right-0">
                <SectionInfoTooltip
                  title="Your AMCs"
                  formula={
                    <>
                      AMC Allocation % = (AMC Total Value ÷ Total Portfolio Value) × 100
                    </>
                  }
                  content={
                    <>
                      Number of Asset Management Companies (AMCs) you invest with. Status is &quot;healthy&quot; when count is in the recommended range (5–7). Top AMCs show total value and allocation % per AMC.
                    </>
                  }
                />
              </div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base text-foreground">Your AMCs</h3>
              </div>

              {/* Compact metric display */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Current</span>
                  <span className="text-xl font-bold text-foreground font-mono">{con.amc_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Recommended</span>
                  <span className="text-sm font-semibold text-muted-foreground font-mono">5-7</span>
                </div>
                <div className="mt-3">
                  <ProgressBarWithLabel
                    value={con.amc_count}
                    max={7}
                    label=""
                    valueLabel=""
                    color={amcStatusColor}
                    height="md"
                    showValue={false}
                  />
                </div>
              </div>

              {/* Compact AMC Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-[10px] uppercase">AMC</TableHead>
                      <TableHead className="text-right text-[10px] uppercase">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(con.top_amcs ?? []).slice(0, 5).map((a, i) => (
                      <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-foreground text-sm">
                          {a.name}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground font-mono text-sm">
                          {a.allocation_pct}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </NarrowCard>
        }
      />
    </div>
  )
}

export const Concentration = memo(ConcentrationInner)
