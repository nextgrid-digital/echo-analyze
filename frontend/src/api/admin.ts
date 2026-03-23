import type { AdminMetricsResponse } from "@/types/admin"

export async function fetchAdminMetrics(accessToken: string): Promise<AdminMetricsResponse> {
  const response = await fetch("/api/admin/metrics", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const payload = (await response.json()) as AdminMetricsResponse & { error?: string }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to load admin metrics.")
  }

  return payload
}
