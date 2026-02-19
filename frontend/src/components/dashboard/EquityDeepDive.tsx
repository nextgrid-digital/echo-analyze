import { memo, useMemo } from "react"
import { WideCard } from "./cards/WideCard"
import { CompactCard } from "./cards/CompactCard"
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
import { toLakhs } from "@/lib/format"
import { CHART_COLORS_3 } from "@/lib/chartColors"
import type { AnalysisSummary, MarketCapAllocation } from "@/types/api"

interface EquityDeepDiveProps {
  summary: AnalysisSummary
}

function EquityDeepDiveInner({ summary }: EquityDeepDiveProps) {
  const isBeating =
    (summary.portfolio_xirr ?? 0) >= (summary.benchmark_xirr ?? 0)
  const missed =
    (summary.benchmark_gains ?? 0) - (summary.total_gain_loss ?? 0)

  const mcData = useMemo(() => {
    const mc: MarketCapAllocation = summary.market_cap
    if (!mc) return []
    return [
      { name: "Large Cap", value: mc.large_cap, color: CHART_COLORS_3[0] },
      { name: "Mid Cap", value: mc.mid_cap, color: CHART_COLORS_3[1] },
      { name: "Small Cap", value: mc.small_cap, color: CHART_COLORS_3[2] },
    ].filter((d) => d.value > 0)
  }, [summary.market_cap])

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Equity Portfolio{" "}
          <span className="text-primary font-medium">Deep Dive</span>
        </h2>
        <SectionInfoTooltip
          title="Equity Deep Dive"
          formula={
            <>
              Equity Invested = Σ(Equity Units × Purchase NAV)<br />
              Equity Current Value = Σ(Equity Units × Latest NAV)<br />
              XIRR = IRR from equity cash flows<br />
              Market Cap % = (Category Value ÷ Total Equity Value) × 100
            </>
          }
          content={
            <>
              Equity-only invested/current value; XIRR (internal rate of return) vs benchmark; market cap split (large/mid/small) from equity holdings. XIRR is computed from cash flows (investments/redemptions); benchmark gains use the same period.
            </>
          }
        />
      </div>

      <div className="space-y-4 sm:space-y-5">
        {/* Status cards for equity metrics */}
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
                title="Invested Equity Value"
                formula={
                  <>
                    Invested Equity Value = Σ(Equity Units × Purchase NAV)
                  </>
                }
                content={
                  <>
                    Sum of cost value of equity holdings only (units × purchase NAV for equity schemes).
                  </>
                }
              />
            </div>
            <p className="text-lg font-bold text-foreground font-mono mb-1">
              {toLakhs(summary.total_cost_value)}
            </p>
            <p className="text-xs text-muted-foreground">Equity holdings cost</p>
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
                title="Current Equity Value"
                formula={
                  <>
                    Current Equity Value = Σ(Equity Units × Latest NAV)
                  </>
                }
                content={
                  <>
                    Sum of market value of equity holdings (units × latest NAV for equity schemes).
                  </>
                }
              />
            </div>
            <p className="text-lg font-bold text-foreground font-mono mb-1">
              {toLakhs(summary.equity_value)}
            </p>
            <p className="text-xs text-muted-foreground">Equity holdings market value</p>
          </CompactCard>

          {/* Portfolio XIRR card */}
          <CompactCard>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${isBeating ? "bg-green-500" : "bg-amber-500"}`} />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Portfolio XIRR
                </p>
              </div>
              <SectionInfoTooltip
                title="Portfolio XIRR"
                formula={
                  <>
                    XIRR: Σ(CFₜ / (1 + XIRR)^t) = 0<br />
                    Internal rate of return from equity cash flows
                  </>
                }
                content={
                  <>
                    XIRR = internal rate of return on your equity cash flows, accounting for timing of investments and redemptions.
                  </>
                }
              />
            </div>
            <p className={`text-lg font-bold font-mono mb-1 ${isBeating ? "text-green-600" : "text-amber-600"}`}>
              {(summary.portfolio_xirr ?? 0).toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {isBeating ? "Beating benchmark" : "Below benchmark"}
            </p>
          </CompactCard>

          {/* Gains card */}
          <CompactCard>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded bg-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Gains
                </p>
              </div>
              <SectionInfoTooltip
                title="Total Gains"
                formula={
                  <>
                    Total Gains = Current Equity Value − Invested Equity Value
                  </>
                }
                content={
                  <>
                    Total gains from equity holdings, calculated as the difference between current market value and invested cost value.
                  </>
                }
              />
            </div>
            <p className="text-lg font-bold text-green-600 font-mono mb-1">
              {toLakhs(summary.total_gain_loss)}
            </p>
            <p className="text-xs text-muted-foreground">Equity portfolio gains</p>
          </CompactCard>
        </div>

        {/* Performance comparison card */}
        <WideCard>
          <div className="relative">
            <div className="absolute top-0 right-0">
              <SectionInfoTooltip
                title="Performance vs Benchmark"
                formula={
                  <>
                    XIRR: Σ(CFₜ / (1 + XIRR)^t) = 0<br />
                    Alpha = Portfolio Gains − Benchmark Gains<br />
                    Missed Gains = Benchmark Gains − Portfolio Gains (if negative)
                  </>
                }
                content={
                  <>
                    Comparison of your equity portfolio performance against the benchmark. Benchmark XIRR/gains assume the same amount invested in the benchmark index over the same period.
                  </>
                }
              />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className={`size-2 rounded-full ${isBeating ? "bg-green-500" : "bg-amber-500"}`} />
              <h3 className="font-semibold text-base text-foreground">
                Performance vs Benchmark
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Portfolio metrics */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Your Portfolio
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold text-foreground font-mono">
                      {(summary.portfolio_xirr ?? 0).toFixed(2)}%
                    </p>
                    <p className="text-sm text-muted-foreground">XIRR</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground font-mono mt-1">
                    {toLakhs(summary.total_gain_loss)} gains
                  </p>
                </div>
              </div>

              {/* Benchmark metrics */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Benchmark
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold text-muted-foreground font-mono">
                      {(summary.benchmark_xirr ?? 0).toFixed(2)}%
                    </p>
                    <p className="text-sm text-muted-foreground">XIRR</p>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground font-mono mt-1">
                    {toLakhs(summary.benchmark_gains)} gains
                  </p>
                </div>
              </div>
            </div>

            {/* Alpha/Missed gains */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {missed > 0 ? "Missed Gains" : "Alpha Generated"}
                </p>
                <p
                  className={`text-lg font-bold font-mono ${
                    missed > 0 ? "text-amber-600" : "text-green-600"
                  }`}
                >
                  {missed > 0
                    ? `-${toLakhs(missed)}`
                    : `+${toLakhs(Math.abs(missed))}`}
                </p>
              </div>
            </div>
          </div>
        </WideCard>

        {/* Market Cap Allocation - Two Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Table Card */}
          <CompactCard>
            <div className="relative">
              <div className="absolute top-0 right-0">
                <SectionInfoTooltip
                  title="Market Cap Allocation"
                  formula={
                    <>
                      Market Cap % = (Category Value ÷ Total Equity Value) × 100
                    </>
                  }
                  content={
                    <>
                      Split of equity by market cap (large / mid / small) from scheme holdings. Percentages are of total equity value.
                    </>
                  }
                />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-4">
                Market Cap Allocation
              </h3>
              {summary.market_cap && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Allocation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS_3[0] }} />
                          <span className="text-sm text-foreground">Large Cap</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono">
                        {summary.market_cap.large_cap}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS_3[1] }} />
                          <span className="text-sm text-foreground">Mid Cap</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono">
                        {summary.market_cap.mid_cap}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS_3[2] }} />
                          <span className="text-sm text-foreground">Small Cap</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono">
                        {summary.market_cap.small_cap}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          </CompactCard>

          {/* Chart Card */}
          <CompactCard>
            <div className="relative">
              <div className="absolute top-0 right-0">
                <SectionInfoTooltip
                  title="Market Cap Visualization"
                  formula={
                    <>
                      Market Cap % = (Category Value ÷ Total Equity Value) × 100
                    </>
                  }
                  content={
                    <>
                      Visual representation of equity allocation by market cap. The donut chart shows the proportion of large, mid, and small cap holdings in your equity portfolio.
                    </>
                  }
                />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-4">
                Allocation Chart
              </h3>
              {mcData.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mcData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {mcData.map((entry, i) => (
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
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 justify-center">
                    {mcData.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {entry.name}: <span className="font-semibold text-foreground">{entry.value}%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-56 w-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No data available</p>
                </div>
              )}
            </div>
          </CompactCard>
        </div>
      </div>
    </div>
  )
}

export const EquityDeepDive = memo(EquityDeepDiveInner)
