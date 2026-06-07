import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
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
      refreshBillingAccess: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
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
    fireEvent.click(screen.getByRole("button", { name: /analyze portfolio/i }))

    await waitFor(() => {
      expect(analyzePortfolio).toHaveBeenCalledWith(pdfFile, "")
    })
  })
})
