/** Vibrant chart palette tuned for dashboard readability */
export const CHART_COLORS = [
  "#14b8a6", // Teal 500
  "#3b82f6", // Blue 500
  "#6366f1", // Indigo 500
  "#f59e0b", // Amber 500
  "#f43f5e", // Rose 500
  "#06b6d4", // Cyan 500
  "#8b5cf6", // Violet 500
  "#10b981", // Emerald 500
] as const

/** 3-slice palette (e.g. market cap, asset allocation) */
export const CHART_COLORS_3: readonly [string, string, string] = [
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
] as const
