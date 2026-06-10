import { CHART_COLORS, CHART_COLORS_3 } from "@/lib/chartColors"

export const MARKETING_PERFORMANCE_DATA = [
  { month: "Jan", portfolio: 100, benchmark: 100 },
  { month: "Feb", portfolio: 102, benchmark: 101 },
  { month: "Mar", portfolio: 105, benchmark: 102 },
  { month: "Apr", portfolio: 103, benchmark: 103 },
  { month: "May", portfolio: 108, benchmark: 104 },
  { month: "Jun", portfolio: 112, benchmark: 105 },
  { month: "Jul", portfolio: 115, benchmark: 106 },
  { month: "Aug", portfolio: 118, benchmark: 107 },
] as const

export const MARKETING_ALLOCATION_DATA = [
  { name: "Equity", value: 68, color: CHART_COLORS_3[0] },
  { name: "Debt", value: 22, color: CHART_COLORS_3[1] },
  { name: "Hybrid", value: 10, color: CHART_COLORS_3[2] },
] as const

export const MARKETING_CHART_PRIMARY = CHART_COLORS[0]
