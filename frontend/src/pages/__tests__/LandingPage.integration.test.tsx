import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { LandingPage } from "../LandingPage"
import { useAuth } from "@/auth/useAuth"

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}))

vi.mock("recharts", async () => {
  const Mock = ({ children }: { children?: unknown }) => <div>{children as never}</div>
  return {
    AreaChart: Mock,
    Area: () => null,
    PieChart: Mock,
    Pie: () => null,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    ResponsiveContainer: Mock,
    CartesianGrid: () => null,
  }
})

class ResizeObserverMock {
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    Object.defineProperty(target, "clientWidth", {
      configurable: true,
      value: 960,
    })
    this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver)
  }

  unobserve() {}

  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock)

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

describe("LandingPage integration", () => {
  beforeEach(() => {
    mockAuth()
  })

  it("renders with real product previews", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { name: /grow with confidence/i })
    ).toBeInTheDocument()
    expect(screen.getAllByText(/key insights/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/performance overview/i)).toBeInTheDocument()
  })
})
