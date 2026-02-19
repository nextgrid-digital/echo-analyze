import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { LineChart, Line, ResponsiveContainer } from "recharts"

interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  sparklineData?: number[]
  tooltip?: ReactNode
  className?: string
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  sparklineData,
  tooltip,
  className,
}: StatCardProps) {
  // Generate sparkline data if not provided but trend exists
  const chartData = sparklineData
    ? sparklineData.map((val, idx) => ({ value: val, index: idx }))
    : trend
      ? Array.from({ length: 12 }, (_, i) => ({
          value: trend.isPositive ? 50 + (i * 50) / 11 : 100 - (i * 50) / 11,
          index: i,
        }))
      : null

  return (
    <div
      className={cn(
        "bg-card border border-border/50 rounded-none p-5 sm:p-6 hover:border-border transition-all duration-200 cursor-default",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
          </div>
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground font-mono leading-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  "text-sm font-semibold",
                  trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        {tooltip && (
          <div className="ml-2 flex-shrink-0">
            <SectionInfoTooltip title={label} content={tooltip} />
          </div>
        )}
      </div>
      {chartData && chartData.length > 0 && (
        <div className="mt-4 h-12 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={trend?.isPositive ? "#059669" : "#dc2626"}
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
