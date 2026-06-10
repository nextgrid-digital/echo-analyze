import { renderHook, act } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { useAdvisorClients } from "../useAdvisorClients"
import { clearAdvisorBook, upsertClientAnalysis } from "@/lib/opportunities/advisorBookStore"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"

describe("useAdvisorClients", () => {
  afterEach(() => {
    clearAdvisorBook()
  })

  it("loads clients from advisor book on mount", () => {
    upsertClientAnalysis(SAMPLE_ANALYSIS)

    const { result } = renderHook(() => useAdvisorClients())

    expect(result.current.clients).toHaveLength(1)
    expect(result.current.clients[0]?.name).toBe("Priya Sharma")
  })

  it("refreshClients updates the list after a new upload", () => {
    const { result } = renderHook(() => useAdvisorClients())

    expect(result.current.clients).toHaveLength(0)

    act(() => {
      upsertClientAnalysis(SAMPLE_ANALYSIS)
      result.current.refreshClients()
    })

    expect(result.current.clients).toHaveLength(1)
  })
})
