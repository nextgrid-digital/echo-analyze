import { renderWithProviders as render, screen } from "@/test/render"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"
import { ClientPerformanceTab } from "../ClientPerformanceTab"

const previewSummary = SAMPLE_ANALYSIS.summary!

describe("ClientPerformanceTab", () => {
  it("renders benchmark chart and underperformers with advisor card layout", () => {
    render(
      <ClientPerformanceTab
        summary={previewSummary}
        holdings={SAMPLE_ANALYSIS.holdings}
      />
    )

    expect(screen.getByText("Performance vs Benchmark")).toBeInTheDocument()
    expect(screen.getByText("Key Insights")).toBeInTheDocument()
    expect(screen.getByText("Underperforming Funds")).toBeInTheDocument()
    expect(screen.getByText("Performing")).toBeInTheDocument()
  })

  it("shows empty state when performance summary is missing", () => {
    render(
      <ClientPerformanceTab
        summary={{ ...previewSummary, performance_summary: undefined }}
        holdings={SAMPLE_ANALYSIS.holdings}
      />
    )

    expect(screen.getByText("Performance Analysis")).toBeInTheDocument()
    expect(screen.getByText(/No performance data available/i)).toBeInTheDocument()
  })
})
