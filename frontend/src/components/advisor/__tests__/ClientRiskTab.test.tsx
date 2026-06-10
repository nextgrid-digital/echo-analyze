import { renderWithProviders as render, screen } from "@/test/render"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import { ClientRiskTab } from "../ClientRiskTab"

const previewSummary = SAMPLE_ANALYSIS.summary!

describe("ClientRiskTab", () => {
  it("renders risk KPI cards and allocation card", () => {
    const { container } = render(
      <ClientRiskTab
        summary={previewSummary}
        holdings={SAMPLE_ANALYSIS.holdings}
      />
    )

    expect(screen.getByText("Volatility")).toBeInTheDocument()
    expect(screen.getByText("Sharpe Ratio")).toBeInTheDocument()
    expect(screen.getByText("Asset Allocation")).toBeInTheDocument()
    expect(screen.getByText("Portfolio Concentration")).toBeInTheDocument()
    expect(container.querySelector(".dashboard-disclaimer")).not.toBeInTheDocument()
  })
})
