import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { EquityDeepDive } from "../EquityDeepDive"
import { createEmptySummary } from "@/lib/emptyData"

vi.mock("recharts", async () => {
  const Mock = ({ children }: { children?: unknown }) => <div>{children as never}</div>
  return {
    PieChart: Mock,
    Pie: Mock,
    Cell: () => null,
    ResponsiveContainer: Mock,
    Tooltip: () => null,
  }
})

describe("EquityDeepDive", () => {
  it("uses equity-only cost and gain fields for key cards", () => {
    const summary = createEmptySummary()
    summary.total_cost_value = 900000
    summary.equity_cost_value = 500000
    summary.equity_value = 620000
    summary.equity_gain_loss = 120000
    summary.benchmark_gains = 110000
    summary.portfolio_xirr = 12.5
    summary.benchmark_xirr = 10.2
    summary.market_cap = { large_cap: 65, mid_cap: 20, small_cap: 15 }

    render(<EquityDeepDive summary={summary} />)

    expect(screen.getByText("Rs 5.00 Lakhs")).toBeInTheDocument()
    expect(screen.getByText("Rs 1.20 Lakhs")).toBeInTheDocument()
    expect(screen.queryByText("Rs 9.00 Lakhs")).not.toBeInTheDocument()
  })
})
