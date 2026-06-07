import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { DashboardPage } from "../DashboardPage"
import { clearLatestAnalysis, storeLatestAnalysis } from "@/lib/analysisSession"
import { buildDashboardPdfFilename } from "@/lib/downloadFilename"
import type { AnalysisResponse } from "@/types/api"

vi.mock("@/components/AdminAccessToolbar", () => ({
  AdminAccessToolbar: () => <div data-testid="admin-access-toolbar">Admin</div>,
}))

vi.mock("@/components/dashboard/Dashboard", () => ({
  Dashboard: ({ summary }: { summary: { statement_date?: string | null } }) => (
    <div data-testid="mock-dashboard">Dashboard {summary.statement_date}</div>
  ),
}))

vi.mock("@/components/dashboard/Footer", () => ({
  Footer: () => <div data-testid="mock-footer">Footer</div>,
}))

vi.mock("@/components/dashboard/WarningRail", () => ({
  WarningRail: () => <div data-testid="mock-warning-rail">Warnings</div>,
}))

const sampleResult: AnalysisResponse = {
  success: true,
  holdings: [],
  summary: {
    total_market_value: 1000,
    total_cost_value: 900,
    total_gain_loss: 100,
    portfolio_return: 11.1,
    portfolio_xirr: 10,
    benchmark_xirr: 8,
    benchmark_gains: 80,
    holdings_count: 0,
    statement_date: "01-Jan-2026",
    asset_allocation: [],
    concentration: {
      fund_count: 0,
      fund_status: "Healthy",
      amc_count: 0,
      amc_status: "Healthy",
      top_funds: [],
      top_amcs: [],
    },
    cost: {
      direct_pct: 0,
      regular_pct: 0,
      portfolio_cost_pct: 0,
      annual_cost: 0,
      total_cost_paid: 0,
      savings_value: 0,
    },
    market_cap: {
      large_cap: 0,
      mid_cap: 0,
      small_cap: 0,
    },
    equity_value: 0,
    equity_pct: 0,
    valuation_mode: "live_nav",
    statement_market_value: 1000,
    live_nav_delta_value: 0,
    equity_cost_value: 0,
    equity_gain_loss: 0,
    fixed_income_cost_value: 0,
    fixed_income_gain_loss: 0,
    tax: {
      short_term_gains: 0,
      long_term_gains: 0,
      tax_free_gains: 0,
      taxable_gains: 0,
      estimated_tax_liability: 0,
      equity_stcg_rate_pct: 20,
      equity_ltcg_rate_pct: 12.5,
      equity_ltcg_exemption: 125000,
    },
    warnings: [],
    data_coverage: {
      benchmark_date_match_pct: 100,
      overlap_source: "none",
      overlap_available_funds: 0,
    },
  },
}

describe("DashboardPage", () => {
  beforeEach(() => {
    clearLatestAnalysis()
  })

  it("restores the latest stored analysis when the dashboard is refreshed", async () => {
    storeLatestAnalysis(sampleResult)

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId("mock-dashboard")).toBeInTheDocument()
    })

    expect(screen.getByText(/portfolio analysis report/i)).toBeInTheDocument()
    expect(screen.getByText(/statement date:/i)).toBeInTheDocument()
    expect(screen.getByText("01-Jan-2026")).toBeInTheDocument()
  })

  it("sanitizes statement dates before using them in PDF filenames", () => {
    expect(buildDashboardPdfFilename("../../31-Mar-2026:\u0000PAN")).toBe(
      "ECHO_Analysis_31-Mar-2026 PAN.pdf"
    )
    expect(buildDashboardPdfFilename("")).toBe("ECHO_Analysis_Report.pdf")
  })
})
