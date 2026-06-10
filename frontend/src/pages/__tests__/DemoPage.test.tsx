import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { DemoPage } from "../DemoPage"
import { useAuth } from "@/auth/useAuth"
import * as demoApi from "@/api/demo"

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}))

vi.mock("@/api/demo", () => ({
  submitDemoRequest: vi.fn(),
}))

function mockAuth() {
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
  })
}

describe("DemoPage", () => {
  beforeEach(() => {
    mockAuth()
    vi.mocked(demoApi.submitDemoRequest).mockReset()
  })

  it("renders the demo request form", () => {
    render(
      <MemoryRouter>
        <DemoPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: /book a demo/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/firm name/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /request demo/i })).toBeInTheDocument()
  })

  it("submits the demo request successfully", async () => {
    vi.mocked(demoApi.submitDemoRequest).mockResolvedValue({ ok: true })

    render(
      <MemoryRouter>
        <DemoPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: "Alex Advisor" },
    })
    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "alex@firm.com" },
    })
    fireEvent.change(screen.getByLabelText(/firm name/i), {
      target: { value: "North Wealth" },
    })
    fireEvent.change(screen.getByLabelText(/clients managed/i), {
      target: { value: "50-500" },
    })
    fireEvent.click(screen.getByRole("button", { name: /request demo/i }))

    await waitFor(() => {
      expect(demoApi.submitDemoRequest).toHaveBeenCalledWith({
        name: "Alex Advisor",
        email: "alex@firm.com",
        firm_name: "North Wealth",
        clients_managed: "50-500",
        message: undefined,
      })
    })

    expect(
      await screen.findByText(/thanks for reaching out/i)
    ).toBeInTheDocument()
  })
})
