import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AdminPage } from "../AdminPage"

vi.mock("@/api/admin", () => ({
  getAdminOverview: vi.fn(),
}))

import { getAdminOverview } from "@/api/admin"

describe("AdminPage", () => {
  it("renders the admin overview when data loads", async () => {
    vi.mocked(getAdminOverview).mockResolvedValue({
      metrics: {
        registered_users: null,
        tracked_users: 1,
        active_users_7d: 1,
        total_analyses: 2,
        successful_analyses: 2,
        failed_analyses: 0,
        success_rate: 100,
        average_duration_ms: 1200,
        fastest_duration_ms: 800,
        slowest_duration_ms: 1600,
        last_analysis_at: "2026-05-26T00:00:00Z",
      },
      recent_analyses: [],
      recent_logs: [],
    })

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/portfolio analytics console/i)).toBeInTheDocument()
    })
  })
})
