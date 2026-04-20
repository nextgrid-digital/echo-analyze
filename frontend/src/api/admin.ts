import { apiFetch, readJson, type TokenGetter } from "@/api/client"
import type { AdminOverviewResponse } from "@/types/auth"

export async function getAdminOverview(getToken: TokenGetter): Promise<AdminOverviewResponse> {
  const response = await apiFetch("/api/admin/overview", { method: "GET" }, getToken)
  const result = await readJson<AdminOverviewResponse & { detail?: string }>(response)

  if (!response.ok || !result) {
    throw new Error(result?.detail ?? `Unable to load admin overview. HTTP ${response.status}`)
  }

  return result
}
