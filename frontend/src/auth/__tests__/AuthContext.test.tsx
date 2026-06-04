import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AuthProvider } from "@/auth/AuthContext"
import { useAuth } from "@/auth/useAuth"
import { getBillingAccess } from "@/api/billing"
import { apiFetch, readJson } from "@/api/client"
import {
  getSupabaseClient,
  getUsernameFromUser,
  isSupabaseAdminUser,
} from "@/lib/supabase"
import type { Session } from "@/lib/supabase"

type AuthStateCallback = (event: string, session: Session | null) => void

vi.mock("@/api/client", () => ({
  apiFetch: vi.fn(),
  readJson: vi.fn(),
}))

vi.mock("@/api/billing", () => ({
  getBillingAccess: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({
  getSupabaseAuthHost: vi.fn(() => "project.supabase.co"),
  getSupabaseClient: vi.fn(),
  getUsernameFromUser: vi.fn(() => "metadata-user"),
  isSupabaseAdminUser: vi.fn(() => false),
  isSupabaseConfigured: vi.fn(() => true),
}))

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <span>{auth.loading ? "loading" : "ready"}</span>
      <span>{auth.username}</span>
      <span>{auth.isAdmin ? "admin" : "not-admin"}</span>
    </div>
  )
}

function OAuthProbe() {
  const auth = useAuth()
  return (
    <button type="button" onClick={() => void auth.signInWithGoogle()}>
      Google
    </button>
  )
}

describe("AuthProvider", () => {
  let emitAuthStateChange: AuthStateCallback | null = null
  let session: Session
  let signInWithOAuth: ReturnType<typeof vi.fn>

  beforeEach(() => {
    emitAuthStateChange = null
    session = {
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_at: 1000,
      user: { id: "user_123" },
    } as Session
    signInWithOAuth = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session } }),
        onAuthStateChange: vi.fn((callback: AuthStateCallback) => {
          emitAuthStateChange = callback
          return {
            data: { subscription: { unsubscribe: vi.fn() } },
          }
        }),
        signInWithOAuth,
      },
    } as unknown as ReturnType<typeof getSupabaseClient>)
    vi.mocked(apiFetch).mockResolvedValue(new Response("{}"))
    vi.mocked(readJson).mockResolvedValue({
      user_id: "user_123",
      username: "allowlisted-admin",
      is_admin: true,
    })
    vi.mocked(getBillingAccess).mockResolvedValue({
      can_analyze: true,
      has_unlimited_reports: false,
      cas_report_limit: 1,
      cas_reports_used: 0,
      remaining_free_reports: 1,
      subscription_status: "free",
      razorpay_subscription_id: null,
      current_period_end: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses the backend auth context so allowlisted admins can reach admin UI", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument()
      expect(screen.getByText("allowlisted-admin")).toBeInTheDocument()
      expect(screen.getByText("admin")).toBeInTheDocument()
    })
  })

  it("falls back to local claims when backend auth context is unavailable", async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response("{}", { status: 503 }))
    vi.mocked(readJson).mockResolvedValue(null)
    vi.mocked(getUsernameFromUser).mockReturnValue("local-user")
    vi.mocked(isSupabaseAdminUser).mockReturnValue(true)

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument()
      expect(screen.getByText("local-user")).toBeInTheDocument()
      expect(screen.getByText("admin")).toBeInTheDocument()
    })
  })

  it("ignores duplicate focus auth events for the same session", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument()
    })

    vi.mocked(apiFetch).mockClear()

    act(() => {
      emitAuthStateChange?.("SIGNED_IN", { ...session, user: { id: "user_123" } } as Session)
    })

    expect(screen.getByText("ready")).toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it("keeps auth ready while refreshing the same user's token", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument()
    })

    vi.mocked(apiFetch).mockClear()
    vi.mocked(apiFetch).mockReturnValueOnce(new Promise(() => {}) as Promise<Response>)

    act(() => {
      emitAuthStateChange?.("TOKEN_REFRESHED", {
        ...session,
        access_token: "new-access-token",
        expires_at: 2000,
        user: { id: "user_123" },
      } as Session)
    })

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByText("ready")).toBeInTheDocument()
    expect(screen.getByText("allowlisted-admin")).toBeInTheDocument()
  })

  it("starts Supabase Google OAuth with the configured redirect options", async () => {
    render(
      <AuthProvider>
        <OAuthProbe />
      </AuthProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Google" }))

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      })
    })
  })
})
