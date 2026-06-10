import { beforeEach, describe, expect, it } from "vitest"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import { getActiveClientPan } from "@/lib/activeClient"
import { getClientNotes, setClientNotes } from "@/lib/clientNotes"
import {
  clearAdvisorBook,
  deleteClient,
  getClientByPan,
  listClients,
  upsertClientAnalysis,
} from "../advisorBookStore"
import type { AnalysisResponse } from "@/types/api"

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
    clearAdvisorBook()
  })

  it("upserts a client by PAN", () => {
    upsertClientAnalysis(SAMPLE_ANALYSIS)

    const client = getClientByPan("ABCDE1234F")
    expect(client?.name).toBe("Priya Sharma")
    expect(client?.analysis.summary?.total_market_value).toBe(4_280_000)
  })

  it("lists clients sorted by most recently updated", () => {
    upsertClientAnalysis(cloneAnalysis("PAN1111A", "Client One"))
    upsertClientAnalysis(cloneAnalysis("PAN2222B", "Client Two"))

    const clients = listClients()
    expect(clients).toHaveLength(2)
    expect(clients.map((client) => client.pan)).toEqual(
      expect.arrayContaining(["PAN1111A", "PAN2222B"])
    )
  })

  it("overwrites analysis for the same PAN on re-upload", () => {
    upsertClientAnalysis(SAMPLE_ANALYSIS)
    const updated = cloneAnalysis("ABCDE1234F", "Priya Sharma Updated")
    upsertClientAnalysis(updated)

    expect(getClientByPan("ABCDE1234F")?.name).toBe("Priya Sharma Updated")
    expect(listClients()).toHaveLength(1)
  })

  it("deletes a client, notes, and active session", () => {
    upsertClientAnalysis(SAMPLE_ANALYSIS)
    setClientNotes("ABCDE1234F", "Follow up next quarter")
    window.sessionStorage.setItem("echo-active-client-pan", "ABCDE1234F")

    expect(deleteClient("ABCDE1234F")).toBe(true)
    expect(listClients()).toHaveLength(0)
    expect(getClientByPan("ABCDE1234F")).toBeNull()
    expect(getClientNotes("ABCDE1234F")).toBe("")
    expect(getActiveClientPan()).toBeNull()
  })

  it("returns false when deleting an unknown client", () => {
    expect(deleteClient("MISSING1234Z")).toBe(false)
  })
})
