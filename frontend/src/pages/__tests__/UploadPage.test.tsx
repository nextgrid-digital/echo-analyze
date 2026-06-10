import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { UploadPage } from "../UploadPage"
import { analyzePortfolio } from "@/api/analyze"
import { useAuth } from "@/auth/useAuth"

vi.mock("@/api/analyze", () => ({
  analyzePortfolio: vi.fn(),
}))

vi.mock("@/components/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="site-header">Header</div>,
}))

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}))

describe("UploadPage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      configured: true,
      loading: false,
      session: null,
      user: { id: "user_test" } as ReturnType<typeof useAuth>["user"],
      username: "test-user",
      isAdmin: false,
      billingAccess: {
        can_analyze: true,
        has_unlimited_reports: false,
        cas_report_limit: 1,
        cas_reports_used: 0,
        remaining_free_reports: 1,
        subscription_status: "free",
        razorpay_subscription_id: null,
        current_period_end: null,
      },
      billingAccessLoading: false,
      billingAccessError: null,
      refreshBillingAccess: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    })
  })

  it("redirects to pricing when the free report quota is already used", async () => {
    vi.mocked(useAuth).mockReturnValue({
      configured: true,
      loading: false,
      session: null,
      user: { id: "user_test" } as ReturnType<typeof useAuth>["user"],
      username: "test-user",
      isAdmin: false,
      billingAccess: {
        can_analyze: false,
        has_unlimited_reports: false,
        cas_report_limit: 1,
        cas_reports_used: 1,
        remaining_free_reports: 0,
        subscription_status: "free",
        razorpay_subscription_id: null,
        current_period_end: null,
      },
      billingAccessLoading: false,
      billingAccessError: null,
      refreshBillingAccess: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={["/upload"]}>
        <Routes>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/pricing" element={<div>Pricing page</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Pricing page")).toBeInTheDocument()
    })
  })

  it("redirects unauthenticated users to sign-in with upload redirect", async () => {
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

    render(
      <MemoryRouter initialEntries={["/upload"]}>
        <Routes>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/sign-in" element={<div>Sign in page</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Sign in page")).toBeInTheDocument()
    })
  })

  it("allows PDF analysis attempts without forcing a password first", async () => {
    vi.mocked(analyzePortfolio).mockResolvedValue({
      success: false,
      holdings: [],
      error: "This PDF is password-protected.",
    })

    const { container } = render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const pdfFile = new File(["%PDF-1.4"], "statement.pdf", { type: "application/pdf" })

    fireEvent.change(fileInput, { target: { files: [pdfFile] } })
    fireEvent.click(screen.getByRole("button", { name: /analyze cas/i }))

    await waitFor(() => {
      expect(analyzePortfolio).toHaveBeenCalledWith(pdfFile, "")
    })
  })
})
