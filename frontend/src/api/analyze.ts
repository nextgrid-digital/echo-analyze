import type { AnalysisResponse } from "@/types/api"

export async function analyzePortfolio(
  file: File,
  password: string
): Promise<AnalysisResponse> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("password", password)

  const response = await fetch("/api/analyze", {
    method: "POST",
    body: formData,
  })

  const result: AnalysisResponse = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? `HTTP ${response.status}`)
  }

  return result
}
