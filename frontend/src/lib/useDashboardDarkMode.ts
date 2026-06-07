import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "echo-dashboard-dark-mode"

function readStoredPreference() {
  if (typeof window === "undefined") {
    return false
  }
  return window.localStorage.getItem(STORAGE_KEY) === "true"
}

export function useDashboardDarkMode() {
  const [isDark, setIsDark] = useState(readStoredPreference)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(isDark))
  }, [isDark])

  const toggle = useCallback(() => {
    setIsDark((current) => !current)
  }, [])

  return { isDark, toggle, setIsDark }
}
