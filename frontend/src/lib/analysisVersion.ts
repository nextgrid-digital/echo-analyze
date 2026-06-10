import type { AnalysisSummary } from "@/types/api"

export const CURRENT_ANALYSIS_VERSION = "2026.06"

export function isStaleAnalysis(summary: AnalysisSummary | null | undefined): boolean {
  if (!summary) return false
  return summary.analysis_version !== CURRENT_ANALYSIS_VERSION
}
