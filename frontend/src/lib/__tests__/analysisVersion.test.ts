import { describe, expect, it } from "vitest"
import { createEmptySummary } from "@/lib/emptyData"
import { CURRENT_ANALYSIS_VERSION, isStaleAnalysis } from "@/lib/analysisVersion"

describe("analysisVersion", () => {
  it("treats missing or outdated analysis_version as stale", () => {
    const withoutVersion = { ...createEmptySummary() }
    delete withoutVersion.analysis_version
    expect(isStaleAnalysis(withoutVersion)).toBe(true)
    expect(isStaleAnalysis({ ...createEmptySummary(), analysis_version: "2025.01" })).toBe(true)
  })

  it("accepts the current analysis version", () => {
    expect(isStaleAnalysis({ ...createEmptySummary(), analysis_version: CURRENT_ANALYSIS_VERSION })).toBe(
      false
    )
  })
})
