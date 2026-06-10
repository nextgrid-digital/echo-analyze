const STORAGE_PREFIX = "echo-advisor-notes:"

function storageKey(clientPan: string): string {
  return `${STORAGE_PREFIX}${clientPan.trim().toUpperCase()}`
}

export function getClientNotes(clientPan: string): string {
  if (!clientPan.trim()) return ""
  try {
    return localStorage.getItem(storageKey(clientPan)) ?? ""
  } catch {
    return ""
  }
}

export function setClientNotes(clientPan: string, notes: string): void {
  if (!clientPan.trim()) return
  try {
    localStorage.setItem(storageKey(clientPan), notes)
  } catch {
    // Ignore quota or privacy errors
  }
}

export function deleteClientNotes(clientPan: string): void {
  if (!clientPan.trim()) return
  try {
    localStorage.removeItem(storageKey(clientPan))
  } catch {
    // Ignore quota or privacy errors
  }
}
