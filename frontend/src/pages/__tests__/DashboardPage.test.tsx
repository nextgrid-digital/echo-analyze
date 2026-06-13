import { renderWithProviders as render, screen, waitFor } from "@/test/render"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DashboardPage } from "../DashboardPage"
import { buildDashboardPdfFilename } from "@/lib/downloadFilename"
import { clearAdvisorBook, upsertClientAnalysis } from "@/lib/opportunities/advisorBookStore"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import type { AdvisorBookClient } from "@/lib/opportunities/types"

const remoteClients = new Map<string, AdvisorBookClient>()

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "advisor@example.com" }, loading: false }),
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

describe("DashboardPage", () => {
  beforeEach(() => {
    remoteClients.clear()
  })

  afterEach(() => {
    clearAdvisorBook()
    remoteClients.clear()
  })

  it("renders advisor home dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: /advisor home/i })).toBeInTheDocument()
    expect(screen.getByText(/good morning/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /upload cas/i })).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /open opportunities/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole("tab", { name: /overview/i })).not.toBeInTheDocument()
  })

  it("shows recent client activity from uploaded CAS reports", async () => {
    await upsertClientAnalysis(SAMPLE_ANALYSIS)

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText("Priya Sharma").length).toBeGreaterThan(0)
    })
  })

  it("redirects legacy dashboard pan links to the client workspace", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?pan=ABCDE1234F"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients/:pan" element={<div>Client workspace</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText("Client workspace")).toBeInTheDocument()
  })

  it("sanitizes statement dates before using them in PDF filenames", () => {
    expect(buildDashboardPdfFilename("../../31-Mar-2026:\u0000PAN")).toBe(
      "ECHO_Analysis_31-Mar-2026 PAN.pdf"
    )
  })
})
