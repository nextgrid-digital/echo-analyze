import { updateAdvisorClientNotes } from "@/api/advisorClients"
import { getClientByPan, updateClientNotesInCache } from "@/lib/opportunities/advisorBookStore"
import {
  deleteLocalClientNotes,
  readLocalClientNotes,
  writeLocalClientNotes,
} from "@/lib/clientNotesLocal"

export { readLocalClientNotes, clearAllLocalClientNotes } from "@/lib/clientNotesLocal"

export function getClientNotes(clientPan: string): string {
  if (!clientPan.trim()) return ""

  const cached = getClientByPan(clientPan)?.notes
  if (cached !== undefined) {
    return cached
  }

  return readLocalClientNotes(clientPan)
}

export async function setClientNotes(clientPan: string, notes: string): Promise<void> {
  if (!clientPan.trim()) return

  updateClientNotesInCache(clientPan, notes)

  try {
    await updateAdvisorClientNotes(clientPan, notes)
    deleteLocalClientNotes(clientPan)
  } catch {
    writeLocalClientNotes(clientPan, notes)
    throw new Error("Could not save notes. Try again later.")
  }
}

export function deleteClientNotes(clientPan: string): void {
  updateClientNotesInCache(clientPan, "")
  deleteLocalClientNotes(clientPan)
}
