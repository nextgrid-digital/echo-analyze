import { renderWithProviders as render, screen } from "@/test/render"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import { PerformanceKpiCards } from "../PerformanceKpiCards"

const previewSummary = SAMPLE_ANALYSIS.summary!

describe("PerformanceKpiCards", () => {
  it("renders four KPI labels when performance data is present", () => {
    const performance = previewSummary.performance_summary!

    render(<PerformanceKpiCards performance={performance} />)

    expect(screen.getByText("Performing")).toBeInTheDocument()
    expect(screen.getByText("Underperforming")).toBeInTheDocument()
    expect(screen.getByText("Upto 3% Gap")).toBeInTheDocument()
    expect(screen.getByText(">3% Gap")).toBeInTheDocument()
  })
})
