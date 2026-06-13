const STORAGE_PREFIX = "echo-advisor-notes:"

function storageKey(clientPan: string): string {
  return `${STORAGE_PREFIX}${clientPan.trim().toUpperCase()}`
}

export function readLocalClientNotes(clientPan: string): string {
  if (!clientPan.trim()) return ""
  try {
    return localStorage.getItem(storageKey(clientPan)) ?? ""
  } catch {
    return ""
  }
}

export function writeLocalClientNotes(clientPan: string, notes: string): void {
  if (!clientPan.trim()) return
  try {
    localStorage.setItem(storageKey(clientPan), notes)
  } catch {
    // Ignore quota or privacy errors
  }
}

export function deleteLocalClientNotes(clientPan: string): void {
  if (!clientPan.trim()) return
  try {
    localStorage.removeItem(storageKey(clientPan))
  } catch {
    // Ignore quota or privacy errors
  }
}

export function clearAllLocalClientNotes(): void {
  if (typeof window === "undefined") return

  const keysToRemove: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore quota or privacy errors
    }
  }
}
