import { describe, expect, it } from "vitest"
import { mapAdvisorClientRow } from "../advisorClients"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"

describe("mapAdvisorClientRow", () => {
  it("maps a database row to an advisor book client", () => {
    const mapped = mapAdvisorClientRow({
      id: "client-id",
      user_id: "user-id",
      client_pan: "ABCDE1234F",
      client_name: "Priya Sharma",
      email: "priya@example.com",
      phone: "+911234567890",
      analysis_json: SAMPLE_ANALYSIS,
      notes: "Review next quarter",
      updated_at: "2026-06-10T12:00:00.000Z",
    })

    expect(mapped).toEqual({
      pan: "ABCDE1234F",
      name: "Priya Sharma",
      email: "priya@example.com",
      phone: "+911234567890",
      analysis: SAMPLE_ANALYSIS,
      notes: "Review next quarter",
      updatedAt: "2026-06-10T12:00:00.000Z",
    })
  })
})
