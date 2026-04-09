import { memo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface MarketCapDataPoint {
  name: string
  value: number
  color: string
}

interface EquityMarketCapDonutChartProps {
  mcData: MarketCapDataPoint[]
}

function EquityMarketCapDonutChartInner({ mcData }: EquityMarketCapDonutChartProps) {
  if (mcData.length === 0) {
    return (
      <div className="h-56 w-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
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
              formatter={(v: number | undefined) => (v != null ? `${v}%` : "")}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
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
  )
}

export const EquityMarketCapDonutChart = memo(EquityMarketCapDonutChartInner)
