/** Dark-theme chart palette with primary accent #ccff00 */
export const CHART_COLORS = ["#ccff00", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f"] as const

/** 3-slice palette (e.g. market cap, asset allocation) */
export const CHART_COLORS_3: readonly [string, string, string] = [
  CHART_COLORS[0],
  CHART_COLORS[1],
  CHART_COLORS[2],
]
