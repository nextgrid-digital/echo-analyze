import { clearLatestAnalysis, loadLatestAnalysis } from "@/lib/analysisSession"
import { clearActiveClientPan, getActiveClientPan } from "@/lib/activeClient"
import { deleteClientNotes } from "@/lib/clientNotes"
import type { AnalysisResponse } from "@/types/api"
import type { AdvisorBook, AdvisorBookClient } from "./types"

const STORAGE_KEY = "echo-advisor-book"

function emptyBook(): AdvisorBook {
  return { clients: {} }
}

function readBook(): AdvisorBook {
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

function writeBook(book: AdvisorBook): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(book))
}

function getClientPan(analysis: AnalysisResponse): string {
  return analysis.summary?.investor_info?.pan?.trim() || "UNKNOWN"
}

function getClientName(analysis: AnalysisResponse): string {
  return analysis.summary?.investor_info?.name?.trim() || "Unknown client"
}

export function clearAdvisorBook(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}

export function upsertClientAnalysis(analysis: AnalysisResponse): AdvisorBookClient | null {
  if (!analysis.success || !analysis.summary) {
    return null
  }

  const pan = getClientPan(analysis)
  const book = readBook()

  const client: AdvisorBookClient = {
    pan,
    name: getClientName(analysis),
    email: analysis.summary.investor_info?.email,
    phone: analysis.summary.investor_info?.phone,
    analysis,
    updatedAt: new Date().toISOString(),
  }

  book.clients[pan] = client
  writeBook(book)
  return client
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

export function deleteClient(pan: string): boolean {
  const storedPan = resolveStoredPan(pan)
  if (!storedPan) {
    return false
  }

  const book = readBook()
  delete book.clients[storedPan]
  writeBook(book)
  deleteClientNotes(storedPan)

  if (getActiveClientPan()?.toUpperCase() === storedPan.toUpperCase()) {
    clearActiveClientPan()
  }

  const latestPan = loadLatestAnalysis()?.summary?.investor_info?.pan?.trim()
  if (latestPan && latestPan.toUpperCase() === storedPan.toUpperCase()) {
    clearLatestAnalysis()
  }

  return true
}
