import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { analyzePortfolio } from "@/api/analyze"
import { useAuth } from "@/auth/useAuth"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import { CasUploadPanel } from "../CasUploadPanel"

vi.mock("@/api/analyze", () => ({
  analyzePortfolio: vi.fn(),
}))

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}))

function mockAuth() {
  vi.mocked(useAuth).mockReturnValue({
    configured: true,
    loading: false,
    session: null,
    user: { id: "user_test" } as ReturnType<typeof useAuth>["user"],
    username: "test-user",
    isAdmin: false,
    billingAccess: {
      can_analyze: true,
      has_unlimited_reports: true,
      cas_report_limit: 100,
      cas_reports_used: 0,
      remaining_free_reports: 100,
      subscription_status: "active",
      razorpay_subscription_id: "sub_test",
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
}

describe("CasUploadPanel", () => {
  beforeEach(() => {
    mockAuth()
    vi.mocked(analyzePortfolio).mockReset()
  })

  it("queues multiple PDFs with separate password fields", () => {
    const { container } = render(
      <MemoryRouter>
        <CasUploadPanel />
      </MemoryRouter>
    )
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

    const firstPdf = new File(["%PDF-1.4"], "client-a.pdf", { type: "application/pdf" })
    const secondPdf = new File(["%PDF-1.4"], "client-b.pdf", { type: "application/pdf" })

    fireEvent.change(fileInput, { target: { files: [firstPdf, secondPdf] } })

    expect(screen.getByText("Files to analyze (2)")).toBeInTheDocument()
    expect(screen.getByText("client-a.pdf")).toBeInTheDocument()
    expect(screen.getByText("client-b.pdf")).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText(/usually the investor pan/i)).toHaveLength(2)
    expect(screen.getByRole("button", { name: /analyze all \(2\)/i })).toBeInTheDocument()
  })

  it("shows retry UI when billing access fails to load", () => {
    vi.mocked(useAuth).mockReturnValue({
      configured: true,
      loading: false,
      session: null,
      user: { id: "user_test" } as ReturnType<typeof useAuth>["user"],
      username: "test-user",
      isAdmin: false,
      billingAccess: null,
      billingAccessLoading: false,
      billingAccessError: "Unable to load billing access. HTTP 503.",
      refreshBillingAccess: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    })

    render(
      <MemoryRouter>
        <CasUploadPanel />
      </MemoryRouter>
    )

    expect(screen.queryByText(/checking report access/i)).not.toBeInTheDocument()
    expect(screen.getByText(/unable to load billing access/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /retry loading access/i })).toBeInTheDocument()
  })

  it("analyzes each queued PDF with its own password", async () => {
    const onClientStored = vi.fn()
    const { container } = render(
      <MemoryRouter>
        <CasUploadPanel onClientStored={onClientStored} />
      </MemoryRouter>
    )
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

    const firstPdf = new File(["%PDF-1.4"], "client-a.pdf", { type: "application/pdf" })
    const secondPdf = new File(["%PDF-1.4"], "client-b.pdf", { type: "application/pdf" })

    fireEvent.change(fileInput, { target: { files: [firstPdf, secondPdf] } })

    const passwordFields = screen.getAllByPlaceholderText(
      /usually the investor pan/i
    ) as HTMLInputElement[]
    fireEvent.change(passwordFields[0]!, { target: { value: "AAAAA1111A" } })
    fireEvent.change(passwordFields[1]!, { target: { value: "BBBBB2222B" } })

    const previewSummary = SAMPLE_ANALYSIS.summary!

    vi.mocked(analyzePortfolio)
      .mockResolvedValueOnce({
        success: true,
        holdings: [],
        summary: {
          ...previewSummary,
          investor_info: { ...previewSummary.investor_info!, pan: "AAAAA1111A", name: "Client A" },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        holdings: [],
        summary: {
          ...previewSummary,
          investor_info: { ...previewSummary.investor_info!, pan: "BBBBB2222B", name: "Client B" },
        },
      })

    fireEvent.click(screen.getByRole("button", { name: /analyze all \(2\)/i }))

    await waitFor(() => {
      expect(analyzePortfolio).toHaveBeenCalledTimes(2)
    })

    expect(analyzePortfolio).toHaveBeenNthCalledWith(1, firstPdf, "AAAAA1111A")
    expect(analyzePortfolio).toHaveBeenNthCalledWith(2, secondPdf, "BBBBB2222B")
    expect(onClientStored).toHaveBeenCalledTimes(2)

    await waitFor(() => {
      expect(screen.getByText(/successfully analyzed 2 of 2 reports/i)).toBeInTheDocument()
    })
  })
})
