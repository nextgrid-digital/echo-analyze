import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import { deleteClientNotes, getClientNotes, setClientNotes } from "../clientNotes"
import { resetAdvisorBookForTests, seedAdvisorBookClient } from "../opportunities/advisorBookStore"

vi.mock("@/api/advisorClients", () => ({
  updateAdvisorClientNotes: vi.fn(async () => undefined),
}))

describe("clientNotes", () => {
  beforeEach(() => {
    resetAdvisorBookForTests()
    seedAdvisorBookClient({
      pan: "ABCDE1234F",
      name: "Priya Sharma",
      analysis: SAMPLE_ANALYSIS,
      notes: "",
      updatedAt: new Date().toISOString(),
    })
  })

  afterEach(() => {
    localStorage.clear()
    resetAdvisorBookForTests()
  })

  it("stores and retrieves notes keyed by PAN", async () => {
    await setClientNotes("ABCDE1234F", "Follow up on SIP review")
    expect(getClientNotes("ABCDE1234F")).toBe("Follow up on SIP review")
  })

  it("normalizes PAN casing in storage key", async () => {
    await setClientNotes("abcde1234f", "Notes for client")
    expect(getClientNotes("ABCDE1234F")).toBe("Notes for client")
  })

  it("returns empty string for missing PAN", () => {
    expect(getClientNotes("UNKNOWN1234Z")).toBe("")
  })

  it("deletes stored notes for a client", async () => {
    await setClientNotes("ABCDE1234F", "Temporary note")
    deleteClientNotes("ABCDE1234F")
    expect(getClientNotes("ABCDE1234F")).toBe("")
  })
})
