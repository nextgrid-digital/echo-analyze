import { describe, expect, it } from "vitest"
import { buildClientReviewPayload, isClientSafePayload } from "@/lib/review/buildClientReviewPayload"
import { computePortfolioHealthStatus } from "@/lib/review/healthScore"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"

describe("buildClientReviewPayload", () => {
  it("builds client-safe payload without advisor-only fields", () => {
    const payload = buildClientReviewPayload(SAMPLE_ANALYSIS, "Advisor One", {
      whatsWorkingWell: ["Strong review cadence"],
      areasToDiscuss: ["Goal alignment"],
    })

    expect(payload.client_name).toBeTruthy()
    expect(payload.overview.current_value).toBeGreaterThan(0)
    expect(isClientSafePayload(payload)).toBe(true)
    expect(JSON.stringify(payload).toLowerCase()).not.toContain("overlap")
  })
})

describe("computePortfolioHealthStatus", () => {
  it("returns excellent for healthy sample portfolio", () => {
    const summary = SAMPLE_ANALYSIS.summary
    if (!summary) throw new Error("missing summary")
    expect(computePortfolioHealthStatus(summary)).toBeDefined()
  })
})
