import { apiFetch, readJson, type TokenGetter } from "@/api/client"
import type { AuthSessionResponse } from "@/types/auth"

export async function getCurrentSession(getToken: TokenGetter): Promise<AuthSessionResponse> {
  const response = await apiFetch("/api/auth/me", { method: "GET" }, getToken)
  const result = await readJson<AuthSessionResponse & { detail?: string }>(response)

  if (!response.ok || !result) {
    throw new Error(result?.detail ?? `Unable to load session. HTTP ${response.status}`)
  }

  return result
}
