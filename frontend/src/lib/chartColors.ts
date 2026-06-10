function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/** Vibrant chart palette tuned for dashboard readability */
export const CHART_COLORS = [
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#8b5cf6",
  "#10b981",
] as const

/** Read chart colors from CSS variables when available */
export function getChartColors(count = 5): string[] {
  const defaults = CHART_COLORS.slice(0, count)
  if (typeof window === "undefined") {
    return [...defaults]
  }
  return Array.from({ length: count }, (_, index) =>
    readCssVar(`--chart-${index + 1}`, defaults[index] ?? CHART_COLORS[0])
  )
}

/** 3-slice palette (e.g. market cap, asset allocation) */
export function getChartColors3(): [string, string, string] {
  const colors = getChartColors(3)
  return [colors[0], colors[1], colors[2]]
}

/** @deprecated Use getChartColors3() for theme-aware colors */
export const CHART_COLORS_3: readonly [string, string, string] = [
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
] as const
