import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { MARKETING_CHART_PRIMARY, MARKETING_PERFORMANCE_DATA } from "./chart-data"

interface MarketingBenchmarkChartProps {
  height?: number
  gradientId?: string
}

export function MarketingBenchmarkChart({
  height = 200,
  gradientId = "marketingPortfolioFill",
}: MarketingBenchmarkChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={[...MARKETING_PERFORMANCE_DATA]}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MARKETING_CHART_PRIMARY} stopOpacity={0.25} />
              <stop offset="100%" stopColor={MARKETING_CHART_PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              border: "1px solid oklch(0.9 0 0)",
              borderRadius: 4,
            }}
          />
          <Area
            type="monotone"
            dataKey="benchmark"
            stroke="oklch(0.65 0 0)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
            name="Benchmark"
          />
          <Area
            type="monotone"
            dataKey="portfolio"
            stroke={MARKETING_CHART_PRIMARY}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            name="Portfolio"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
