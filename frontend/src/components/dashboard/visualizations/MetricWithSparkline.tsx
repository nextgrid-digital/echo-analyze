import { LineChart, Line, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

interface MetricWithSparklineProps {
  sparklineData: number[]
  trend?: "up" | "down" | "neutral"
  color?: string
  className?: string
}

export function MetricWithSparkline({
  sparklineData,
  trend = "neutral",
  color,
  className,
}: MetricWithSparklineProps) {
  const chartData = sparklineData.map((val, idx) => ({ value: val, index: idx }))
  const trendColor =
    color ??
    (trend === "up"
      ? "#059669"
      : trend === "down"
        ? "#dc2626"
        : "#6b7280")

  return (
    <div className={cn("w-full", className)}>
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={trendColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
