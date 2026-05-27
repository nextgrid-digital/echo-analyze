import { getSupabaseAccessToken } from "@/lib/supabase"

export async function readJson<T>(response: Response): Promise<T | null> {
  const responseText = await response.text()
  if (!responseText) {
    return null
  }

  try {
    return JSON.parse(responseText) as T
  } catch {
    return null
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const accessToken = await getSupabaseAccessToken()
  const headers = new Headers(init.headers)
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`)
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  })
}
