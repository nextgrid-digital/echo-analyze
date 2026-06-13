import {
  deleteAdvisorClient,
  fetchAdvisorClients,
  upsertAdvisorClient,
} from "@/api/advisorClients"
import { clearLatestAnalysis, loadLatestAnalysis } from "@/lib/analysisSession"
import { clearActiveClientPan, getActiveClientPan } from "@/lib/activeClient"
import {
  clearAllLocalClientNotes,
  deleteLocalClientNotes,
  readLocalClientNotes,
} from "@/lib/clientNotesLocal"
import type { AnalysisResponse } from "@/types/api"
import type { AdvisorBook, AdvisorBookClient } from "./types"

const STORAGE_KEY = "echo-advisor-book"

let memoryBook: AdvisorBook = { clients: {} }
let hydrated = false
let hydrateInFlight: Promise<void> | null = null

function emptyBook(): AdvisorBook {
  return { clients: {} }
}

function setMemoryBook(book: AdvisorBook): void {
  memoryBook = book
}

function readBook(): AdvisorBook {
  return memoryBook
}

function writeMemoryClient(client: AdvisorBookClient): void {
  memoryBook.clients[client.pan] = client
}

function readLocalBook(): AdvisorBook {
  if (typeof window === "undefined") {
    return emptyBook()
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyBook()
    const parsed = JSON.parse(raw) as AdvisorBook
    if (!parsed?.clients || typeof parsed.clients !== "object") {
      return emptyBook()
    }
    return parsed
  } catch {
    return emptyBook()
  }
}

function clearLocalBook(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}

function getClientPan(analysis: AnalysisResponse): string {
  return analysis.summary?.investor_info?.pan?.trim() || "UNKNOWN"
}

function getClientName(analysis: AnalysisResponse): string {
  return analysis.summary?.investor_info?.name?.trim() || "Unknown client"
}

export function isAdvisorBookHydrated(): boolean {
  return hydrated
}

export function seedAdvisorBookClient(client: AdvisorBookClient): void {
  writeMemoryClient(client)
  hydrated = true
}

export function resetAdvisorBookForTests(): void {
  memoryBook = emptyBook()
  hydrated = false
  hydrateInFlight = null
  clearLocalBook()
  clearAllLocalClientNotes()
}

export function resetAdvisorBookOnSignOut(): void {
  memoryBook = emptyBook()
  hydrated = false
  hydrateInFlight = null
}

export function clearAdvisorBook(): void {
  resetAdvisorBookForTests()
}

async function migrateLocalAdvisorBookToServer(): Promise<void> {
  const localBook = readLocalBook()
  const localClients = Object.values(localBook.clients)
  if (localClients.length === 0) {
    return
  }

  const serverClients = await fetchAdvisorClients()
  if (serverClients.length > 0) {
    clearLocalBook()
    clearAllLocalClientNotes()
    return
  }

  for (const client of localClients) {
    const notes = client.notes ?? readLocalClientNotes(client.pan)
    await upsertAdvisorClient({
      ...client,
      notes,
      updatedAt: client.updatedAt || new Date().toISOString(),
    })
  }

  clearLocalBook()
  clearAllLocalClientNotes()
}

export async function hydrateAdvisorBookFromServer(force = false): Promise<void> {
  if (hydrated && !force) {
    return
  }
  if (hydrateInFlight) {
    return hydrateInFlight
  }

  hydrateInFlight = (async () => {
    try {
      if (!force) {
        await migrateLocalAdvisorBookToServer()
      }
      const clients = await fetchAdvisorClients()
      const book = emptyBook()
      for (const client of clients) {
        book.clients[client.pan] = client
      }
      setMemoryBook(book)
      hydrated = true
    } catch {
      hydrated = false
      throw new Error("Could not load advisor clients. Try again later.")
    } finally {
      hydrateInFlight = null
    }
  })()

  return hydrateInFlight
}

export function updateClientNotesInCache(clientPan: string, notes: string): void {
  const storedPan = resolveStoredPan(clientPan)
  if (!storedPan) {
    return
  }

  const existing = memoryBook.clients[storedPan]
  if (!existing) {
    return
  }

  memoryBook.clients[storedPan] = {
    ...existing,
    notes,
  }
}

export async function upsertClientAnalysis(
  analysis: AnalysisResponse
): Promise<AdvisorBookClient | null> {
  if (!analysis.success || !analysis.summary) {
    return null
  }

  const pan = getClientPan(analysis)
  const existing = getClientByPan(pan)

  const client: AdvisorBookClient = {
    pan,
    name: getClientName(analysis),
    email: analysis.summary.investor_info?.email,
    phone: analysis.summary.investor_info?.phone,
    analysis,
    notes: existing?.notes ?? readLocalClientNotes(pan),
    updatedAt: new Date().toISOString(),
  }

  const saved = await upsertAdvisorClient(client)
  writeMemoryClient(saved)
  hydrated = true
  deleteLocalClientNotes(pan)
  return saved
}

export function getAdvisorBook(): AdvisorBook {
  return readBook()
}

export function listClients(): AdvisorBookClient[] {
  return Object.values(readBook().clients).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function getClientByPan(pan: string): AdvisorBookClient | null {
  const book = readBook()
  if (book.clients[pan]) {
    return book.clients[pan]
  }

  const normalized = pan.trim().toUpperCase()
  const match = Object.keys(book.clients).find((key) => key.toUpperCase() === normalized)
  return match ? book.clients[match] : null
}

function resolveStoredPan(pan: string): string | null {
  const book = readBook()
  if (book.clients[pan]) {
    return pan
  }

  const normalized = pan.trim().toUpperCase()
  return Object.keys(book.clients).find((key) => key.toUpperCase() === normalized) ?? null
}

export async function deleteClient(pan: string): Promise<boolean> {
  const storedPan = resolveStoredPan(pan)
  if (!storedPan) {
    return false
  }

  await deleteAdvisorClient(storedPan)

  const book = readBook()
  delete book.clients[storedPan]
  deleteLocalClientNotes(storedPan)

  if (getActiveClientPan()?.toUpperCase() === storedPan.toUpperCase()) {
    clearActiveClientPan()
  }

  const latestPan = loadLatestAnalysis()?.summary?.investor_info?.pan?.trim()
  if (latestPan && latestPan.toUpperCase() === storedPan.toUpperCase()) {
    clearLatestAnalysis()
  }

  return true
}
