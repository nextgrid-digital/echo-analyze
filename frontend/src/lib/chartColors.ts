/** Vibrant chart palette for dashboard visualizations */
export const CHART_COLORS = [
  "#10b981", // Emerald
  "#0ea5e9", // Sky
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#06b6d4", // Cyan
  "#6366f1", // Indigo
  "#ec4899", // Pink
] as const

/** 3-slice palette (e.g. market cap, asset allocation) */
export const CHART_COLORS_3: readonly [string, string, string] = [
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
]