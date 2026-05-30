import { fireEvent, render, screen } from "@testing-library/react"
import { AuthPanel } from "@/auth/AuthPage"
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
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  })
}

describe("AuthPanel", () => {
  it("keeps Google OAuth locked while it is not configured", () => {
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined)
    mockAuth({ signInWithGoogle })

    render(<AuthPanel />)

    const googleButton = screen.getByRole("button", { name: /continue with google, coming soon/i })
    expect(googleButton).toBeDisabled()
    expect(googleButton.closest("span")).toHaveAttribute("title", "Coming soon")

    fireEvent.click(googleButton)
    expect(signInWithGoogle).not.toHaveBeenCalled()
  })
})
