export type TokenGetter = () => Promise<string | null>

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  getToken?: TokenGetter
): Promise<Response> {
  const headers = new Headers(init.headers)

  if (getToken) {
    const token = await getToken()
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  })
}

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
