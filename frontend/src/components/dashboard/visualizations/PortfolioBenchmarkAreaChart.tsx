import { memo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { CHART_COLORS } from "@/lib/chartColors"
import { toLakhs } from "@/lib/format"

interface ChartDataPoint {
  date: string
  portfolio: number
  benchmark: number
  difference: number
  portfolioPct: number
  benchmarkPct: number
}

interface PortfolioBenchmarkAreaChartProps {
  chartData: ChartDataPoint[]
  chartId?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload?: ChartDataPoint }>
}

function PortfolioBenchmarkAreaChartInner({
  chartData,
  chartId = "portfolio-benchmark",
}: PortfolioBenchmarkAreaChartProps) {
  const portfolioGradientId = `${chartId}-portfolio`
  const benchmarkGradientId = `${chartId}-benchmark`

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0]?.payload
    const portfolioValue = data?.portfolio || 0
    const benchmarkValue = data?.benchmark || 0
    const portfolioPct = data?.portfolioPct || 0
    const benchmarkPct = data?.benchmarkPct || 0
    const difference = data?.difference || 0

    return (
      <div className="bg-background border border-border rounded-none p-2 shadow-sm">
        <p className="text-xs font-semibold text-foreground mb-1.5">
          {data?.date || ""}
        </p>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: CHART_COLORS[0] }} />
            <span className="text-[10px] text-muted-foreground">Portfolio:</span>
            <span className="text-[10px] font-semibold text-foreground">
              {toLakhs(portfolioValue)} ({portfolioPct >= 0 ? "+" : ""}{portfolioPct.toFixed(2)}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: CHART_COLORS[1] }} />
            <span className="text-[10px] text-muted-foreground">Benchmark:</span>
            <span className="text-[10px] font-semibold text-foreground">
              {toLakhs(benchmarkValue)} ({benchmarkPct >= 0 ? "+" : ""}{benchmarkPct.toFixed(2)}%)
            </span>
          </div>
          <div className="pt-0.5 mt-0.5 border-t border-border">
            <span className="text-[10px] text-muted-foreground">Difference: </span>
            <span
              className={`text-[10px] font-semibold ${
                difference >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {difference >= 0 ? "+" : ""}
              {toLakhs(difference)} ({(portfolioPct - benchmarkPct).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={portfolioGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id={benchmarkGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            if (value >= 100_000) {
              return `Rs ${(value / 100_000).toFixed(1)}L`
            }
            return `Rs ${(value / 1000).toFixed(0)}K`
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: "10px" }}
          iconType="square"
          formatter={(value) => (
            <span className="text-xs text-foreground">{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="benchmark"
          name="Benchmark"
          stroke={CHART_COLORS[1]}
          strokeWidth={2}
          fill={`url(#${benchmarkGradientId})`}
          fillOpacity={0.6}
          isAnimationActive
          animationDuration={800}
        />
        <Area
          type="monotone"
          dataKey="portfolio"
          name="Portfolio"
          stroke={CHART_COLORS[0]}
          strokeWidth={3}
          fill={`url(#${portfolioGradientId})`}
          fillOpacity={0.6}
          isAnimationActive
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const PortfolioBenchmarkAreaChart = memo(PortfolioBenchmarkAreaChartInner)
