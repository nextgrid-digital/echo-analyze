import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AdminPage } from "../AdminPage"

vi.mock("@/api/admin", () => ({
  getAdminOverview: vi.fn(),
}))

vi.mock("@/hooks/useSessionAccess", () => ({
  useSessionAccess: vi.fn(),
}))

import { useSessionAccess } from "@/hooks/useSessionAccess"

describe("AdminPage", () => {
  it("renders a session error state instead of crashing when the signed-in session cannot be loaded", () => {
    vi.mocked(useSessionAccess).mockReturnValue({
      session: null,
      loading: false,
      error: "Unable to load session.",
    })

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/session unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/unable to load session/i)).toBeInTheDocument()
  })
})
