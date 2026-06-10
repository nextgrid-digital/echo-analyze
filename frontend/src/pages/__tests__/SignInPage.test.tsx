import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { SignInPage } from "../SignInPage"
import { useAuth } from "@/auth/useAuth"

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}))

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    configured: true,
    loading: false,
    session: null,
    user: null,
    username: "Unknown user",
    isAdmin: false,
    billingAccess: null,
    billingAccessLoading: false,
    billingAccessError: null,
    refreshBillingAccess: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  })
}

describe("SignInPage", () => {
  beforeEach(() => {
    mockAuth()
  })

  it("renders the split layout sign-in form with Google and sign-up link", () => {
    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <SignInPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument()
    const signUpLinks = screen.getAllByRole("link", { name: /sign up/i })
    expect(signUpLinks.some((link) => link.getAttribute("href")?.startsWith("/sign-up"))).toBe(
      true
    )
    expect(
      screen.getByText(/portfolio intelligence for modern wealth advisors/i)
    ).toBeInTheDocument()

    const termsLink = screen.getByRole("link", { name: /terms of service/i })
    const privacyLink = screen.getByRole("link", { name: /privacy policy/i })
    expect(termsLink).toHaveAttribute("href", "/terms")
    expect(privacyLink).toHaveAttribute("href", "/privacy")
  })
})
