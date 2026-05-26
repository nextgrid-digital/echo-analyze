import { apiFetch, readJson } from "@/api/client"
import type { AdminOverviewResponse } from "@/types/admin"

export async function getAdminOverview(): Promise<AdminOverviewResponse> {
  const response = await apiFetch("/api/admin/overview", { method: "GET" })
  const result = await readJson<AdminOverviewResponse & { detail?: string }>(response)

  if (!response.ok || !result) {
    throw new Error(result?.detail ?? `Unable to load admin overview. HTTP ${response.status}`)
  }

  return result
}
