import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { CHART_COLORS, CHART_COLORS_3 } from "@/lib/chartColors"

const PERFORMANCE_DATA = [
  { month: "Jan", portfolio: 100, benchmark: 100 },
  { month: "Feb", portfolio: 102, benchmark: 101 },
  { month: "Mar", portfolio: 105, benchmark: 102 },
  { month: "Apr", portfolio: 103, benchmark: 103 },
  { month: "May", portfolio: 108, benchmark: 104 },
  { month: "Jun", portfolio: 112, benchmark: 105 },
  { month: "Jul", portfolio: 115, benchmark: 106 },
  { month: "Aug", portfolio: 118, benchmark: 107 },
]

const ALLOCATION_DATA = [
  { name: "Equity", value: 68 },
  { name: "Debt", value: 22 },
  { name: "Hybrid", value: 10 },
]

const STATS = [
  { label: "Portfolio value", value: "42.8L" },
  { label: "1Y XIRR", value: "+14.2%" },
  { label: "Funds", value: "18" },
] as const

export function DashboardPreview() {
  return (
    <div className="marketing-dashboard-preview relative overflow-hidden border border-border bg-card shadow-apple">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
        <span className="ml-2 text-xs font-medium text-muted-foreground">ECHO Dashboard</span>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-5">
        {STATS.map((stat) => (
          <div key={stat.label} className="border border-border bg-background px-3 py-3 sm:px-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold sm:text-xl">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-5 sm:gap-4 sm:px-5 sm:pb-5">
        <div className="border border-border bg-background p-3 sm:col-span-3 sm:p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Portfolio vs benchmark</p>
          <div className="h-[140px] sm:h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PERFORMANCE_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "oklch(0.45 0 0)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    border: "1px solid oklch(0.9 0 0)",
                    borderRadius: 0,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  stroke="oklch(0.7 0 0)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                  name="Benchmark"
                />
                <Area
                  type="monotone"
                  dataKey="portfolio"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  fill="url(#portfolioFill)"
                  name="Portfolio"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-border bg-background p-3 sm:col-span-2 sm:p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Asset allocation</p>
          <div className="flex items-center gap-3">
            <div className="h-[100px] w-[100px] flex-none sm:h-[120px] sm:w-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ALLOCATION_DATA}
                    dataKey="value"
                    innerRadius="55%"
                    outerRadius="90%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {ALLOCATION_DATA.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS_3[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 space-y-2">
              {ALLOCATION_DATA.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 flex-none"
                    style={{ backgroundColor: CHART_COLORS_3[index] }}
                  />
                  <span className="truncate text-muted-foreground">{item.name}</span>
                  <span className="ml-auto font-mono font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-foreground/[0.03] blur-2xl" />
      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-foreground/[0.04] blur-xl" />
    </div>
  )
}
