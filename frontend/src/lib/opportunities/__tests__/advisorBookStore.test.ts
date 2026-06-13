import { beforeEach, describe, expect, it, vi } from "vitest"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import { getActiveClientPan } from "@/lib/activeClient"
import { getClientNotes, readLocalClientNotes } from "@/lib/clientNotes"
import type { AdvisorBookClient } from "../types"
import type { AnalysisResponse } from "@/types/api"
import {
  clearAdvisorBook,
  deleteClient,
  getClientByPan,
  listClients,
  resetAdvisorBookForTests,
  seedAdvisorBookClient,
  upsertClientAnalysis,
} from "../advisorBookStore"

const remoteClients = new Map<string, AdvisorBookClient>()

vi.mock("@/api/advisorClients", () => ({
  fetchAdvisorClients: vi.fn(async () =>
    Array.from(remoteClients.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  ),
  upsertAdvisorClient: vi.fn(async (client: AdvisorBookClient) => {
    remoteClients.set(client.pan, client)
    return client
  }),
  deleteAdvisorClient: vi.fn(async (pan: string) => {
    const normalized = pan.trim().toUpperCase()
    for (const key of [...remoteClients.keys()]) {
      if (key.toUpperCase() === normalized) {
        remoteClients.delete(key)
      }
    }
  }),
  updateAdvisorClientNotes: vi.fn(async (pan: string, notes: string) => {
    const normalized = pan.trim().toUpperCase()
    for (const [key, client] of remoteClients.entries()) {
      if (key.toUpperCase() === normalized) {
        remoteClients.set(key, { ...client, notes })
        return
      }
    }
    throw new Error("Client not found.")
  }),
}))

function cloneAnalysis(pan: string, name: string): AnalysisResponse {
  return {
    ...SAMPLE_ANALYSIS,
    summary: {
      ...SAMPLE_ANALYSIS.summary!,
      investor_info: {
        ...SAMPLE_ANALYSIS.summary!.investor_info,
        pan,
        name,
      },
    },
  }
}

describe("advisorBookStore", () => {
  beforeEach(() => {
    resetAdvisorBookForTests()
    remoteClients.clear()
  })

  it("upserts a client by PAN", async () => {
    await upsertClientAnalysis(SAMPLE_ANALYSIS)

    const client = getClientByPan("ABCDE1234F")
    expect(client?.name).toBe("Priya Sharma")
    expect(client?.analysis.summary?.total_market_value).toBe(4_280_000)
    expect(remoteClients.size).toBe(1)
  })

  it("lists clients sorted by most recently updated", async () => {
    await upsertClientAnalysis(cloneAnalysis("PAN1111A", "Client One"))
    await upsertClientAnalysis(cloneAnalysis("PAN2222B", "Client Two"))

    const clients = listClients()
    expect(clients).toHaveLength(2)
    expect(clients.map((client) => client.pan)).toEqual(
      expect.arrayContaining(["PAN1111A", "PAN2222B"])
    )
  })

  it("overwrites analysis for the same PAN on re-upload", async () => {
    await upsertClientAnalysis(SAMPLE_ANALYSIS)
    const updated = cloneAnalysis("ABCDE1234F", "Priya Sharma Updated")
    await upsertClientAnalysis(updated)

    expect(getClientByPan("ABCDE1234F")?.name).toBe("Priya Sharma Updated")
    expect(listClients()).toHaveLength(1)
  })

  it("deletes a client, notes, and active session", async () => {
    await upsertClientAnalysis(SAMPLE_ANALYSIS)
    seedAdvisorBookClient({
      ...getClientByPan("ABCDE1234F")!,
      notes: "Follow up next quarter",
    })
    window.sessionStorage.setItem("echo-active-client-pan", "ABCDE1234F")

    expect(await deleteClient("ABCDE1234F")).toBe(true)
    expect(listClients()).toHaveLength(0)
    expect(getClientByPan("ABCDE1234F")).toBeNull()
    expect(getClientNotes("ABCDE1234F")).toBe("")
    expect(getActiveClientPan()).toBeNull()
  })

  it("returns false when deleting an unknown client", async () => {
    expect(await deleteClient("MISSING1234Z")).toBe(false)
  })

  it("clears advisor book state", () => {
    remoteClients.set("ABCDE1234F", {
      pan: "ABCDE1234F",
      name: "Priya Sharma",
      analysis: SAMPLE_ANALYSIS,
      updatedAt: new Date().toISOString(),
    })
    clearAdvisorBook()
    expect(listClients()).toHaveLength(0)
    expect(readLocalClientNotes("ABCDE1234F")).toBe("")
  })
})
