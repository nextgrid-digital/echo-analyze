import { apiFetch, type TokenGetter } from "@/api/client"
import type { AnalysisResponse } from "@/types/api"

export async function analyzePortfolio(
  file: File,
  password: string,
  getToken?: TokenGetter
): Promise<AnalysisResponse> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("password", password)

  const response = await apiFetch("/api/analyze", {
    method: "POST",
    body: formData,
  }, getToken)

  const responseText = await response.text()
  let result: AnalysisResponse | null = null

  try {
    result = responseText ? JSON.parse(responseText) as AnalysisResponse : null
  } catch {
    result = null
  }

  if (!response.ok) {
    const fallbackMessage = responseText || `HTTP ${response.status}`
    throw new Error(result?.error ?? fallbackMessage)
  }

  if (!result) {
    throw new Error("Invalid server response.")
  }

  return result
}
