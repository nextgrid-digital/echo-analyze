import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderWithProviders as render, screen, waitFor } from "@/test/render"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { setActiveClientPan } from "@/lib/activeClient"
import { resetAdvisorBookForTests, upsertClientAnalysis } from "@/lib/opportunities/advisorBookStore"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import { FundDetailPage } from "../FundDetailPage"
import type { AdvisorBookClient } from "@/lib/opportunities/types"

const remoteClients = new Map<string, AdvisorBookClient>()

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}))

vi.mock("@/api/advisorClients", () => ({
  fetchAdvisorClients: vi.fn(async () => Array.from(remoteClients.values())),
  upsertAdvisorClient: vi.fn(async (client: AdvisorBookClient) => {
    remoteClients.set(client.pan, client)
    return client
  }),
  deleteAdvisorClient: vi.fn(async () => undefined),
  updateAdvisorClientNotes: vi.fn(async () => undefined),
}))

describe("FundDetailPage", () => {
  beforeEach(async () => {
    resetAdvisorBookForTests()
    remoteClients.clear()
    await upsertClientAnalysis(SAMPLE_ANALYSIS)
    setActiveClientPan("ABCDE1234F")
  })

  it("renders fund details for a known holding", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/holdings/100033"]}>
        <Routes>
          <Route path="/dashboard/holdings/:holdingKey" element={<FundDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /HDFC Flexi Cap Fund/i })).toBeInTheDocument()
    })

    expect(screen.getByText("15.2%")).toBeInTheDocument()
    expect(
      screen.getByText(/Illustrative headlines for advisor discussion/i)
    ).toBeInTheDocument()
  })

  it("shows not found state for unknown holding key", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/holdings/unknown-fund"]}>
        <Routes>
          <Route path="/dashboard/holdings/:holdingKey" element={<FundDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Fund not found")).toBeInTheDocument()
    })

    expect(screen.getByRole("link", { name: /view holdings/i })).toHaveAttribute(
      "href",
      "/clients/ABCDE1234F?tab=holdings"
    )
  })
})
