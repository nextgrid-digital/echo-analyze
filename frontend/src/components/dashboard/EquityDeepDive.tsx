import { memo, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { toLakhs } from "@/lib/format"
import type { AnalysisSummary, MarketCapAllocation } from "@/types/api"

interface EquityDeepDiveProps {
  summary: AnalysisSummary
}

const MC_COLORS = ["#059669", "#34d399", "#e2e8f0"]

function EquityDeepDiveInner({ summary }: EquityDeepDiveProps) {
  const isBeating =
    (summary.portfolio_xirr ?? 0) >= (summary.benchmark_xirr ?? 0)
  const missed =
    (summary.benchmark_gains ?? 0) - (summary.total_gain_loss ?? 0)

  const mcData = useMemo(() => {
    const mc: MarketCapAllocation = summary.market_cap
    if (!mc) return []
    return [
      { name: "Large Cap", value: mc.large_cap, color: MC_COLORS[0] },
      { name: "Mid Cap", value: mc.mid_cap, color: MC_COLORS[1] },
      { name: "Small Cap", value: mc.small_cap, color: MC_COLORS[2] },
    ].filter((d) => d.value > 0)
  }, [summary.market_cap])

  return (
    <div className="mb-8 sm:mb-12">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Equity Portfolio{" "}
          <span className="text-indigo-400 font-medium">Deep Dive</span>
        </h2>
        <SectionInfoTooltip
          title="Equity Deep Dive"
          content={
            <>
              Equity-only invested/current value; XIRR (internal rate of return) vs
              benchmark; market cap split (large/mid/small) from equity holdings.
              XIRR is computed from cash flows (investments/redemptions); benchmark
              gains use the same period.
            </>
          }
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <Card className="border-slate-100">
              <CardContent className="p-4 sm:p-6 relative">
                <div className="absolute top-4 right-4">
                  <SectionInfoTooltip
                    title="Invested Equity Value"
                    content={
                      <>
                        Sum of cost value of equity holdings only (units × purchase
                        NAV for equity schemes).
                      </>
                    }
                  />
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Invested Equity Value
                </p>
                <h4 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {toLakhs(summary.total_cost_value)}
                </h4>
              </CardContent>
            </Card>
            <Card className="border-slate-100">
              <CardContent className="p-4 sm:p-6 relative">
                <div className="absolute top-4 right-4">
                  <SectionInfoTooltip
                    title="Current Equity Value"
                    content={
                      <>
                        Sum of market value of equity holdings (units × latest NAV
                        for equity schemes).
                      </>
                    }
                  />
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Current Equity Value
                </p>
                <h4 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {toLakhs(summary.equity_value)}
                </h4>
              </CardContent>
            </Card>
          </div>

          <Card
            className={
              isBeating
                ? "border-emerald-100 bg-emerald-50/30"
                : "border-red-100 bg-red-50/30"
            }
          >
            <CardContent className="p-4 sm:p-6 lg:p-8 relative">
              <div className="absolute top-4 right-4">
                <SectionInfoTooltip
                  title="XIRR vs Benchmark"
                  content={
                    <>
                      XIRR = internal rate of return on your equity cash flows.
                      Benchmark XIRR/gains assume the same amount invested in the
                      benchmark. Missed gains = benchmark gains − your gains (if
                      underperforming).
                    </>
                  }
                />
              </div>
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div
                  className={`size-2 rounded-full ${
                    isBeating ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <h3 className="font-bold text-lg text-slate-800">
                  {isBeating
                    ? "Outperforming the Benchmark"
                    : "Underperforming the Benchmark"}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-y-4 sm:gap-y-8 gap-x-6 sm:gap-x-12">
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                    Your Portfolio XIRR
                  </p>
                  <h4 className="text-2xl font-bold text-slate-900">
                    {summary.portfolio_xirr ?? 0}%
                  </h4>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                    Your Gains
                  </p>
                  <h4 className="text-2xl font-bold text-slate-900">
                    {toLakhs(summary.total_gain_loss)}
                  </h4>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                    Benchmark XIRR
                  </p>
                  <h4 className="text-xl font-bold text-slate-600">
                    {summary.benchmark_xirr ?? 0}%
                  </h4>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                    Benchmark Gains
                  </p>
                  <h4 className="text-xl font-bold text-slate-600">
                    {toLakhs(summary.benchmark_gains)}
                  </h4>
                </div>
              </div>
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                  {missed > 0 ? "Total Missed Gains" : "Alpha Generated"}
                </p>
                <h4
                  className={
                    missed > 0
                      ? "text-2xl font-bold text-red-500"
                      : "text-2xl font-bold text-emerald-500"
                  }
                >
                  {missed > 0
                    ? toLakhs(missed)
                    : "+" + toLakhs(Math.abs(missed))}
                </h4>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-100">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="Market Cap Allocation"
                content={
                  <>
                    Split of equity by market cap (large / mid / small) from scheme
                    holdings. Percentages are of total equity value.
                  </>
                }
              />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-slate-800 mb-4 sm:mb-6">
              Market Cap Allocation
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-12 mb-6 sm:mb-8">
              <div className="space-y-4">
                {summary.market_cap && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-emerald-600" />
                      <span className="text-xs text-slate-500 font-bold">
                        Large Cap{" "}
                        <span className="text-slate-800">
                          {summary.market_cap.large_cap}%
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-emerald-300" />
                      <span className="text-xs text-slate-500 font-bold">
                        Mid Cap{" "}
                        <span className="text-slate-800">
                          {summary.market_cap.mid_cap}%
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-slate-200" />
                      <span className="text-xs text-slate-500 font-bold">
                        Small Cap{" "}
                        <span className="text-slate-800">
                          {summary.market_cap.small_cap}%
                        </span>
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="size-32 min-h-[200px] sm:min-h-0 w-full max-w-full">
                {mcData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mcData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={0}
                        dataKey="value"
                      >
                        {mcData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => v != null ? `${v}%` : ""} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const EquityDeepDive = memo(EquityDeepDiveInner)
