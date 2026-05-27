import { apiFetch, readJson } from "@/api/client"
import type { AdminLogWindow, AdminOverviewResponse } from "@/types/admin"

export async function getAdminOverview(logWindow: AdminLogWindow): Promise<AdminOverviewResponse> {
  const response = await apiFetch(`/api/admin/overview?log_window=${logWindow}`, { method: "GET" })
  const result = await readJson<AdminOverviewResponse & { detail?: string }>(response)

  if (!response.ok || !result) {
    throw new Error(result?.detail ?? `Unable to load admin overview. HTTP ${response.status}`)
  }

  return result
}
