import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import App from "@/App"
import { useAuth } from "@/auth/useAuth"

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}))

vi.mock("@/pages/LandingPage", () => ({
  LandingPage: () => <div>landing-page</div>,
}))

vi.mock("@/pages/DashboardPage", () => ({
  DashboardPage: () => <div>dashboard-home</div>,
}))

vi.mock("@/components/AuthRequired", () => ({
  AuthRequired: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function mockAuthLoading(loading: boolean, user: { id: string } | null) {
  vi.mocked(useAuth).mockReturnValue({
    configured: true,
    loading,
    session: null,
    user: user as ReturnType<typeof useAuth>["user"],
    username: "test-user",
    isAdmin: false,
    billingAccess: null,
    billingAccessLoading: false,
    billingAccessError: null,
    refreshBillingAccess: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  })
}

describe("App root redirect", () => {
  it("redirects signed-in users from / to /dashboard", async () => {
    mockAuthLoading(false, { id: "user-1" })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    )

    expect(await screen.findByText("dashboard-home")).toBeInTheDocument()
    expect(screen.queryByText("landing-page")).not.toBeInTheDocument()
  })

  it("shows landing page for signed-out users at /", async () => {
    mockAuthLoading(false, null)

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    )

    expect(await screen.findByText("landing-page")).toBeInTheDocument()
    expect(screen.queryByText("dashboard-home")).not.toBeInTheDocument()
  })
})
