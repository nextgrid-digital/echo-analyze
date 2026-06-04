import { apiFetch } from "@/api/client"
import type { AnalysisResponse } from "@/types/api"

export async function analyzePortfolio(
  file: File,
  password: string,
): Promise<AnalysisResponse> {
  const formData = new FormData()
  formData.append("file", file)
  if (file.name.toLowerCase().endsWith(".pdf")) {
    formData.append("password", password)
  }

  const response = await apiFetch("/api/analyze", {
    method: "POST",
    body: formData,
  })

  const responseText = await response.text()
  let result: AnalysisResponse | null = null
  let detail: string | null = null

  try {
    const parsed = responseText ? JSON.parse(responseText) as AnalysisResponse & { detail?: unknown } : null
    result = parsed
    if (typeof parsed?.detail === "string") {
      detail = parsed.detail
    }
  } catch {
    result = null
  }

  if (!response.ok) {
    const fallbackMessage = responseText || `HTTP ${response.status}`
    throw new Error(result?.error ?? detail ?? fallbackMessage)
  }

  if (!result) {
    throw new Error("Invalid server response.")
  }

  return result
}
