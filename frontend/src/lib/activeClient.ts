const STORAGE_KEY = "echo-active-client-pan"

export function setActiveClientPan(pan: string): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(STORAGE_KEY, pan)
}

export function getActiveClientPan(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem(STORAGE_KEY)
}

export function clearActiveClientPan(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(STORAGE_KEY)
}
