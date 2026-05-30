import { render, screen, waitFor } from "@testing-library/react"
import { AuthProvider } from "@/auth/AuthContext"
import { useAuth } from "@/auth/useAuth"
import { apiFetch, readJson } from "@/api/client"
import {
  getSupabaseClient,
  getUsernameFromUser,
  isSupabaseAdminUser,
} from "@/lib/supabase"

vi.mock("@/api/client", () => ({
  apiFetch: vi.fn(),
  readJson: vi.fn(),
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

describe("AuthProvider", () => {
  beforeEach(() => {
    const session = {
      access_token: "access-token",
      user: { id: "user_123" },
    }
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session } }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    } as unknown as ReturnType<typeof getSupabaseClient>)
    vi.mocked(apiFetch).mockResolvedValue(new Response("{}"))
    vi.mocked(readJson).mockResolvedValue({
      username: "allowlisted-admin",
      is_admin: true,
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
})
