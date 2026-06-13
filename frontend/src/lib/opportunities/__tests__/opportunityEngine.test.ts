import { describe, expect, it } from "vitest"
import { detectClientOpportunities } from "@/lib/opportunities/opportunityEngine"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import type { AdvisorBookClient } from "@/lib/opportunities/types"

const sampleClient: AdvisorBookClient = {
  pan: "ABCDE1234F",
  name: "Priya Sharma",
  analysis: {
    ...SAMPLE_ANALYSIS,
    investment_events: [
      { date: "2024-01-01", type: "sip", amount: 5000, scheme_name: "Fund A" },
      { date: "2024-02-01", type: "sip", amount: 5000, scheme_name: "Fund A" },
    ],
  },
  updatedAt: new Date().toISOString(),
}

describe("opportunityEngine", () => {
  it("detects at least one opportunity for a sample client", () => {
    const opportunities = detectClientOpportunities(sampleClient)
    expect(opportunities.length).toBeGreaterThan(0)
    expect(opportunities[0]).toMatchObject({
      clientPan: "ABCDE1234F",
      clientName: "Priya Sharma",
      priority: expect.stringMatching(/high|medium|low/),
    })
  })
})
