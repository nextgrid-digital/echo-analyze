import { memo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface CreditSlice {
  name: string
  value: number
  color: string
}

interface FixedIncomeCreditQualityDonutChartProps {
  data: CreditSlice[]
}

function FixedIncomeCreditQualityDonutChartInner({
  data,
}: FixedIncomeCreditQualityDonutChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-32 w-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={50}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={`fi-credit-slice-${entry.name}-${i}`} fill={entry.color} />
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
  )
}

export const FixedIncomeCreditQualityDonutChart = memo(
  FixedIncomeCreditQualityDonutChartInner,
)
