const DEFAULT_REDIRECT = "/dashboard"

export function getAuthRedirectPath(searchParams: URLSearchParams): string {
  const redirect = searchParams.get("redirect")?.trim()
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return DEFAULT_REDIRECT
  }
  return redirect
}

export function withAuthRedirect(path: string, redirectTo: string): string {
  return `${path}?redirect=${encodeURIComponent(redirectTo)}`
}
