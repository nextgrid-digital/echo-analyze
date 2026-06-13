import type { AnalysisResponse } from "@/types/api"

export interface AdvisorBookClient {
  pan: string
  name: string
  email?: string | null
  phone?: string | null
  analysis: AnalysisResponse
  notes?: string
  updatedAt: string
}

export interface AdvisorBook {
  clients: Record<string, AdvisorBookClient>
}
