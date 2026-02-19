/** Professional chart palette - cohesive colors optimized for readability */
export const CHART_COLORS = [
  "#059669", // Primary emerald (professional green)
  "#0284c7", // Sky blue
  "#7c3aed", // Violet
  "#ea580c", // Orange
  "#dc2626", // Red
] as const

/** 3-slice palette (e.g. market cap, asset allocation) */
export const CHART_COLORS_3: readonly [string, string, string] = [
  CHART_COLORS[0],
  CHART_COLORS[1],
  CHART_COLORS[2],
]
