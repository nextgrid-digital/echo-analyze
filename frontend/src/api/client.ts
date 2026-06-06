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

function isSameOriginRequest(input: RequestInfo | URL): boolean {
  if (typeof window === "undefined" || !window.location?.origin) {
    return true
  }

  const requestUrl =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url

  try {
    return new URL(requestUrl, window.location.origin).origin === window.location.origin
  } catch {
    return false
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const accessToken = await getSupabaseAccessToken()
  const headers = new Headers(init.headers)
  const isSameOrigin = isSameOriginRequest(input)
  if (accessToken && isSameOrigin) {
    headers.set("Authorization", `Bearer ${accessToken}`)
  } else if (!isSameOrigin) {
    headers.delete("Authorization")
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  })
}
