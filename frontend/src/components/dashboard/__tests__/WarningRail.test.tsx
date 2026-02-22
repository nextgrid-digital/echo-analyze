import { fireEvent, render, screen } from "@testing-library/react"
import { WarningRail } from "../WarningRail"
import type { AnalysisWarning } from "@/types/api"

describe("WarningRail", () => {
  it("renders grouped notices by section", () => {
    const warnings: AnalysisWarning[] = [
      {
        code: "LIVE_NAV_PARTIAL_FALLBACK",
        section: "valuation",
        severity: "warn",
        message: "Live NAV unavailable for 2 schemes.",
      },
      {
        code: "PERFORMANCE_PARTIAL_COVERAGE",
        section: "performance",
        severity: "info",
        message: "Performance attribution is partial.",
      },
    ]

    render(<WarningRail warnings={warnings} />)

    expect(screen.getByText("Data Quality & Methodology Notices")).toBeInTheDocument()
    expect(screen.getByText("Valuation")).toBeInTheDocument()
    expect(screen.getByText("Performance")).toBeInTheDocument()
    expect(screen.getByText("Live NAV unavailable for 2 schemes.")).toBeInTheDocument()
    expect(screen.getByText("Performance attribution is partial.")).toBeInTheDocument()
  })

  it("renders an info button when warning has affected schemes", () => {
    const warnings: AnalysisWarning[] = [
      {
        code: "LIVE_NAV_PARTIAL_FALLBACK",
        section: "valuation",
        severity: "warn",
        message: "Live NAV unavailable for 1 scheme.",
        affected_schemes: ["ABC Fund - Direct Plan - Growth"],
      },
    ]

    render(<WarningRail warnings={warnings} />)

    expect(
      screen.getByLabelText(/what this section shows and how it's calculated/i)
    ).toBeInTheDocument()
  })

  it("shows affected funds tooltip content on focus", async () => {
    const warnings: AnalysisWarning[] = [
      {
        code: "LIVE_NAV_PARTIAL_FALLBACK",
        section: "valuation",
        severity: "warn",
        message: "Live NAV unavailable for 1 scheme.",
        affected_schemes: ["ABC Fund - Direct Plan - Growth"],
      },
    ]

    render(<WarningRail warnings={warnings} />)

    const trigger = screen.getByLabelText(
      /what this section shows and how it's calculated/i
    )
    fireEvent.focus(trigger)

    const matches = await screen.findAllByText("ABC Fund - Direct Plan - Growth")
    expect(matches.length).toBeGreaterThan(0)
  })

  it("does not render when there are no warnings", () => {
    const { container } = render(<WarningRail warnings={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
