import type { AnalysisResponse } from "@/types/api"

let latestAnalysis: AnalysisResponse | null = null

function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<AnalysisResponse>
  return typeof candidate.success === "boolean" && Array.isArray(candidate.holdings)
}

export function clearLatestAnalysis() {
  latestAnalysis = null
}

export function storeLatestAnalysis(result: AnalysisResponse) {
  if (!isAnalysisResponse(result)) {
    return
  }

  latestAnalysis = result
}

export function loadLatestAnalysis(): AnalysisResponse | null {
  if (!latestAnalysis || !isAnalysisResponse(latestAnalysis)) {
    clearLatestAnalysis()
    return null
  }

  return latestAnalysis
}
