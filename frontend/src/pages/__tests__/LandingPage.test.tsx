import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { LandingPage } from "../LandingPage"
import { useAuth } from "@/auth/useAuth"

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}))

vi.mock("@/components/marketing/EchoHero", () => ({
  EchoHero: () => (
    <section>
      <h1>Grow with confidence.</h1>
      <p>Portfolio intelligence for modern wealth advisors.</p>
      <a href="/demo">Book a demo</a>
      <a href="/sign-in">Sign in</a>
      <div data-testid="hero-preview" />
    </section>
  ),
}))

vi.mock("@/components/marketing/ProductPreviews", () => ({
  HeroWorkspacePreviewFrame: () => <div data-testid="hero-preview" />,
  PerformanceChartPreviewFrame: () => <div data-testid="performance-preview" />,
  InsightsPreview: () => <div data-testid="insights-preview" />,
  KpiStripPreviewFrame: () => <div data-testid="kpi-preview" />,
  WorkspaceSlicePreviewFrame: () => <div data-testid="workspace-slice-preview" />,
  ClientBookPreview: () => <div data-testid="client-book-preview" />,
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

describe("LandingPage", () => {
  beforeEach(() => {
    mockAuth()
  })

  it("renders advisor-first hero and primary demo CTA", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { name: /grow with confidence/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/portfolio intelligence for modern wealth advisors/i)
    ).toBeInTheDocument()

    const demoLinks = screen.getAllByRole("link", { name: /book a demo|book demo/i })
    expect(demoLinks.some((link) => link.getAttribute("href") === "/demo")).toBe(true)
  })

  it("surfaces official benchmark and portfolio data sources", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { name: /benchmarks anchored to official india market data/i })
    ).toBeInTheDocument()
    for (const source of ["SEBI & AMFI", "NSE & BSE", "AMFI", "CAMS", "CRISIL"]) {
      expect(screen.getByRole("heading", { level: 3, name: source })).toBeInTheDocument()
    }
  })

  it("does not include removed consumer marketing phrases", () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const text = container.textContent ?? ""
    expect(text).not.toMatch(/AI-powered/i)
    expect(text).not.toMatch(/sample portfolio/i)
    expect(text).not.toMatch(/fully analyzed/i)
    expect(text).not.toMatch(/Mutual fund portfolio analyzer/i)
  })
})
