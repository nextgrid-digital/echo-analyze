import { apiFetch, readJson } from "@/api/client"

export type ClientsManagedBand = "under-50" | "50-500" | "500-plus"

export interface DemoRequestPayload {
  name: string
  email: string
  firm_name: string
  clients_managed: ClientsManagedBand
  message?: string
}

export interface DemoRequestResponse {
  ok: boolean
}

export async function submitDemoRequest(
  payload: DemoRequestPayload
): Promise<DemoRequestResponse> {
  const response = await apiFetch("/api/demo-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = await readJson<{ ok?: boolean; detail?: string; error?: string }>(response)
  if (!response.ok) {
    const message =
      (typeof data?.detail === "string" && data.detail) ||
      (typeof data?.error === "string" && data.error) ||
      "Unable to submit demo request. Please try again."
    throw new Error(message)
  }

  return { ok: data?.ok === true }
}
