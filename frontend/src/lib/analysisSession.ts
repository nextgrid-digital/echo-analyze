import type { AnalysisResponse } from "@/types/api"

interface StoredAnalysisPayload {
  userId: string
  result: AnalysisResponse
}

let latestAnalysis: StoredAnalysisPayload | null = null

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

export function storeLatestAnalysis(result: AnalysisResponse, userId?: string | null) {
  if (!userId || !isAnalysisResponse(result)) {
    return
  }

  latestAnalysis = { userId, result }
}

export function loadLatestAnalysis(userId?: string | null): AnalysisResponse | null {
  if (!userId || !latestAnalysis) {
    return null
  }

  if (latestAnalysis.userId !== userId || !isAnalysisResponse(latestAnalysis.result)) {
    clearLatestAnalysis()
    return null
  }

  return latestAnalysis.result
}
