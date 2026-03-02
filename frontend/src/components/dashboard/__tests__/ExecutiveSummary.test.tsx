import { render, screen } from "@testing-library/react"
import { ExecutiveSummary } from "../ExecutiveSummary"
import { createEmptySummary } from "@/lib/emptyData"

describe("ExecutiveSummary", () => {
  it("uses normalized asset allocation for equity insight", () => {
    const summary = createEmptySummary()
    summary.equity_pct = 100
    summary.asset_allocation = [
      { category: "Equity", value: 600000, allocation_pct: 60 },
      { category: "Debt - Market", value: 300000, allocation_pct: 30 },
      { category: "Liquid", value: 100000, allocation_pct: 10 },
    ]
    summary.guidelines = {
      investment_guidelines: {
        asset_allocation: [
          { label: "Equity", current: 60, recommended: 80 },
          { label: "Fixed Income", current: 40, recommended: 20 },
        ],
        equity_mc: [],
        fi_metrics: [],
      },
      equity_indicative: [],
      fi_indicative: [],
    }

    render(<ExecutiveSummary summary={summary} />)

    expect(screen.getByText("60.0% (Target: 80.0%)")).toBeInTheDocument()
    expect(
      screen.queryByText("100.0% (Target: 80.0%)")
    ).not.toBeInTheDocument()
  })
})