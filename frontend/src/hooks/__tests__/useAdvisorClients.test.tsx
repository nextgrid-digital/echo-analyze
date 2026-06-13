import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAdvisorClients } from "../useAdvisorClients"
import { resetAdvisorBookForTests, upsertClientAnalysis } from "@/lib/opportunities/advisorBookStore"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import type { AdvisorBookClient } from "@/lib/opportunities/types"

const remoteClients = new Map<string, AdvisorBookClient>()

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}))

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
  deleteAdvisorClient: vi.fn(async () => undefined),
  updateAdvisorClientNotes: vi.fn(async () => undefined),
}))

describe("useAdvisorClients", () => {
  beforeEach(() => {
    resetAdvisorBookForTests()
    remoteClients.clear()
  })

  afterEach(() => {
    resetAdvisorBookForTests()
    remoteClients.clear()
  })

  it("loads clients from advisor book on mount", async () => {
    await upsertClientAnalysis(SAMPLE_ANALYSIS)

    const { result } = renderHook(() => useAdvisorClients())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.clients).toHaveLength(1)
    expect(result.current.clients[0]?.name).toBe("Priya Sharma")
  })

  it("refreshClients updates the list after a new upload", async () => {
    const { result } = renderHook(() => useAdvisorClients())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.clients).toHaveLength(0)

    await act(async () => {
      await upsertClientAnalysis(SAMPLE_ANALYSIS)
      await result.current.refreshClients()
    })

    expect(result.current.clients).toHaveLength(1)
  })
})
