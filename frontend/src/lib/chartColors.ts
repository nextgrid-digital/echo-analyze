/** Professional chart palette — muted, finance-grade tones */
export const CHART_COLORS = [
  "#0f766e", // Teal 700
  "#1d4ed8", // Blue 700
  "#4338ca", // Indigo 700
  "#b45309", // Amber 700
  "#be123c", // Rose 700
  "#0e7490", // Cyan 700
  "#475569", // Slate 600
  "#6d28d9", // Violet 700
] as const

/** 3-slice palette (e.g. market cap, asset allocation) */
export const CHART_COLORS_3: readonly [string, string, string] = [
  "#0f766e",
  "#1d4ed8",
  "#4338ca",
] as const
