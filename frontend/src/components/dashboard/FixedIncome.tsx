import { memo, useMemo } from "react"
import { WideCard } from "./cards/WideCard"
import { CompactCard } from "./cards/CompactCard"
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { toLakhs } from "@/lib/format"
import { CHART_COLORS_3 } from "@/lib/chartColors"
import type { FixedIncomeData } from "@/types/api"

interface FixedIncomeProps {
  fixedIncome: FixedIncomeData
}

function FixedIncomeInner({ fixedIncome }: FixedIncomeProps) {
  const fi = fixedIncome
  const creditData = useMemo(
    () => [
      { name: "AAA", value: fi.credit_quality.aaa_pct, color: CHART_COLORS_3[0] },
      { name: "AA", value: fi.credit_quality.aa_pct, color: CHART_COLORS_3[1] },
      {
        name: "Below AA",
        value: fi.credit_quality.below_aa_pct,
        color: CHART_COLORS_3[2],
      },
    ].filter((d) => d.value > 0),
    [fi.credit_quality]
  )

  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-3 border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-900">
        Estimated/partial metrics: fixed-income YTM is shown only when available from source holdings data; otherwise it is marked N/A.
      </div>
      <div className="flex items-center justify-end gap-2 mb-4">
        <SectionInfoTooltip
          title="Fixed Income Deep Dive"
          formula={
            <>
              FI Invested = Σ(FI Units × Purchase NAV)<br />
              FI Current Value = Σ(FI Units × Latest NAV)<br />
              IRR = Internal Rate of Return from FI cash flows<br />
              YTM = Yield to Maturity
            </>
          }
          content={
            <>
              Invested/current value of fixed income holdings; IRR (internal rate of return) and Net YTM (yield to maturity). Credit quality and category allocation are derived from underlying debt schemes.
            </>
          }
        />
      </div>

      <div className="space-y-4 sm:space-y-5">
        {/* Status cards for FI metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Invested Value card */}
          <CompactCard>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted-foreground/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded bg-muted-foreground" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Invested Value
                </p>
              </div>
              <SectionInfoTooltip
                title="Invested Value"
                formula={
                  <>
                    FI Invested = Σ(FI Units × Purchase NAV)
                  </>
                }
                content={
                  <>
                    Sum of cost value of fixed income holdings only (units × purchase NAV for debt schemes).
                  </>
                }
              />
            </div>
            <p className="text-lg font-bold text-foreground font-mono mb-1">
              {toLakhs(fi.invested_value)}
            </p>
            <p className="text-xs text-muted-foreground">FI holdings cost</p>
          </CompactCard>

          {/* Current Value card */}
          <CompactCard>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded bg-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Value
                </p>
              </div>
              <SectionInfoTooltip
                title="Current Value"
                formula={
                  <>
                    FI Current Value = Σ(FI Units × Latest NAV)
                  </>
                }
                content={
                  <>
                    Sum of market value of fixed income holdings (units × latest NAV for debt schemes).
                  </>
                }
              />
            </div>
            <p className="text-lg font-bold text-foreground font-mono mb-1">
              {toLakhs(fi.current_value)}
            </p>
            <p className="text-xs text-muted-foreground">FI holdings market value</p>
          </CompactCard>

          {/* FI IRR card */}
          <CompactCard>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  FI IRR
                </p>
              </div>
              <SectionInfoTooltip
                title="FI IRR"
                formula={
                  <>
                    IRR = Internal Rate of Return from FI cash flows<br />
                    Σ(CFₜ / (1 + IRR)^t) = 0
                  </>
                }
                content={
                  <>
                    Internal rate of return on fixed income cash flows, accounting for timing of investments and redemptions.
                  </>
                }
              />
            </div>
            <p className="text-lg font-bold text-blue-600 font-mono mb-1">
              {fi.irr !== null && fi.irr !== undefined ? `${fi.irr}%` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">Internal rate of return</p>
          </CompactCard>

          {/* Net YTM card */}
          <CompactCard>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Net YTM
                </p>
              </div>
              <SectionInfoTooltip
                title="Net YTM"
                formula={
                  <>
                    YTM = Yield to Maturity<br />
                    Annual return if held until maturity
                  </>
                }
                content={
                  <>
                    Net Yield to Maturity - the annual return expected if the fixed income holdings are held until maturity.
                  </>
                }
              />
            </div>
            <p className="text-lg font-bold text-purple-600 font-mono mb-1">
              {fi.ytm !== null && fi.ytm !== undefined ? `${fi.ytm}%` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">Yield to maturity</p>
          </CompactCard>
        </div>

        {/* Credit Quality and Category Allocation - Side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Credit Quality Card */}
          <CompactCard>
            <div className="relative">
              <div className="absolute top-0 right-0">
                <SectionInfoTooltip
                  title="Credit Quality"
                  formula={
                    <>
                      Credit Rating % = (Rating Category Value ÷ Total FI Value) × 100<br />
                      Category Value = (Rating % ÷ 100) × Total FI Value
                    </>
                  }
                  content={
                    <>
                      Split of fixed income by credit rating (AAA, AA, below AA) from underlying holdings. Percentages are of total fixed income value. Higher credit ratings indicate lower default risk.
                    </>
                  }
                />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-4">
                Credit Quality
              </h3>
              {creditData.length > 0 ? (
                <div className="space-y-4">
                  {/* Credit rating breakdown with values */}
                  <div className="space-y-3">
                    {creditData.map((entry, i) => {
                      const categoryValue = (entry.value / 100) * fi.current_value
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="size-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm text-foreground font-medium">
                                {entry.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-mono">
                                {toLakhs(categoryValue)}
                              </span>
                              <span className="text-base font-bold text-foreground font-mono">
                                {entry.value}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-muted h-1.5">
                            <div
                              className="h-full"
                              style={{
                                width: `${entry.value}%`,
                                backgroundColor: entry.color,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Summary metrics */}
                  <div className="pt-3 border-t border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Total Value
                        </p>
                        <p className="text-sm font-bold text-foreground font-mono">
                          {toLakhs(fi.current_value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Total Gains
                        </p>
                        <p className="text-sm font-bold text-green-600 font-mono">
                          {toLakhs(fi.current_value - fi.invested_value)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={creditData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {creditData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid rgba(0,0,0,0.1)",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            fontSize: "11px",
                          }}
                          formatter={(v: number | undefined) => v != null ? `${v}%` : ""}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </div>
          </CompactCard>

          {/* Category Allocation Card */}
          <CompactCard>
            <div className="relative">
              <div className="absolute top-0 right-0">
                <SectionInfoTooltip
                  title="Category Allocation"
                  formula={
                    <>
                      Category Allocation % = (Category Value ÷ Total FI Value) × 100<br />
                      Category Value = (Allocation % ÷ 100) × Total FI Value
                    </>
                  }
                  content={
                    <>
                      Allocation % of fixed income by category (e.g. Gilt, Corporate, Liquid). Each category represents a different type of debt instrument with varying risk and return characteristics.
                    </>
                  }
                />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-4">
                Category Allocation
              </h3>
              {fi.category_allocation.length > 0 ? (
                <div className="space-y-4">
                  {/* Category breakdown with values */}
                  <div className="space-y-3">
                    {fi.category_allocation.map((a, i) => {
                      const color = CHART_COLORS_3[i % CHART_COLORS_3.length]
                      const categoryValue = (a.allocation_pct / 100) * fi.current_value
                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="size-2 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-sm text-foreground font-medium">
                                {a.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-mono">
                                {toLakhs(categoryValue)}
                              </span>
                              <span className="text-sm font-bold text-foreground font-mono">
                                {a.allocation_pct}%
                              </span>
                            </div>
                          </div>
                          <ProgressBarWithLabel
                            value={a.allocation_pct}
                            max={100}
                            label=""
                            valueLabel=""
                            color={color}
                            height="sm"
                            showValue={false}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* Summary metrics */}
                  <div className="pt-3 border-t border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Categories
                        </p>
                        <p className="text-sm font-bold text-foreground font-mono">
                          {fi.category_allocation.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Avg Allocation
                        </p>
                        <p className="text-sm font-bold text-foreground font-mono">
                          {fi.category_allocation.length > 0
                            ? (100 / fi.category_allocation.length).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Top category highlight */}
                  {fi.category_allocation.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Largest Category
                      </p>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor:
                              CHART_COLORS_3[
                                fi.category_allocation.findIndex(
                                  (c) =>
                                    c.allocation_pct ===
                                    Math.max(...fi.category_allocation.map((ca) => ca.allocation_pct))
                                )
                              ] || CHART_COLORS_3[0],
                          }}
                        />
                        <span className="text-sm font-semibold text-foreground">
                          {
                            fi.category_allocation.reduce((max, cat) =>
                              cat.allocation_pct > max.allocation_pct ? cat : max
                            ).category
                          }
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          (
                          {
                            fi.category_allocation.reduce((max, cat) =>
                              cat.allocation_pct > max.allocation_pct ? cat : max
                            ).allocation_pct
                          }
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </div>
          </CompactCard>
        </div>

        {/* Top Holdings - Split into 2 cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Top Funds Card */}
          <WideCard>
            <div className="relative">
              <div className="absolute top-0 right-0">
                <SectionInfoTooltip
                  title="Top Funds"
                  formula={
                    <>
                      Allocation % = (Fund Value ÷ Total FI Value) × 100
                    </>
                  }
                  content={
                    <>
                      Top fixed income funds by market value.
                    </>
                  }
                />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-4">
                Top Funds
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fund</TableHead>
                    <TableHead className="text-right text-xs">Allocation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fi.top_funds.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-foreground text-sm py-2 max-w-0">
                        <div className="truncate" title={f.name}>
                          {f.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground font-mono text-sm py-2 whitespace-nowrap">
                        {f.allocation_pct}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </WideCard>

          {/* Top AMCs Card */}
          <WideCard>
            <div className="relative">
              <div className="absolute top-0 right-0">
                <SectionInfoTooltip
                  title="Top AMCs"
                  formula={
                    <>
                      Allocation % = (AMC Value ÷ Total FI Value) × 100
                    </>
                  }
                  content={
                    <>
                      Top Asset Management Companies (AMCs) by market value.
                    </>
                  }
                />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-4">
                Top AMCs
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">AMC</TableHead>
                    <TableHead className="text-right text-xs">Allocation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fi.top_amcs.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-foreground text-sm py-2 max-w-0">
                        <div className="truncate" title={a.name}>
                          {a.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground font-mono text-sm py-2 whitespace-nowrap">
                        {a.allocation_pct}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </WideCard>
        </div>
      </div>
    </div>
  )
}

export const FixedIncome = memo(FixedIncomeInner)
