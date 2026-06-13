import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
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

describe("AuthPanel", () => {
  it("starts Google OAuth when the Google sign-in button is clicked", async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined)
    mockAuth({ signInWithGoogle })

    render(
      <MemoryRouter>
        <AuthPanel />
      </MemoryRouter>
    )

    const googleButton = screen.getByRole("button", { name: /continue with google/i })
    expect(googleButton).toBeEnabled()

    fireEvent.click(googleButton)
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith("/dashboard"))
  })
})
