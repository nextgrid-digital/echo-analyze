import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { PortfolioBenchmarkChart } from "../visualizations/PortfolioBenchmarkChart"
import { createEmptySummary } from "@/lib/emptyData"
import type { Holding } from "@/types/api"

vi.mock("recharts", async () => {
  const Mock = ({ children }: { children?: unknown }) => <div>{children as never}</div>
  return {
    AreaChart: Mock,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    ResponsiveContainer: Mock,
    CartesianGrid: () => null,
  }
})

const holdings: Holding[] = []

describe("PortfolioBenchmarkChart", () => {
  it("accepts negative annual rates above -100 without invalid-rate warning", () => {
    const summary = createEmptySummary()
    summary.total_cost_value = 100000
    summary.portfolio_xirr = -50
    summary.benchmark_xirr = -25

    render(<PortfolioBenchmarkChart summary={summary} holdings={holdings} />)

    expect(screen.queryByText(/unavailable rates are shown as flat reference lines/i)).not.toBeInTheDocument()
  })

  it("shows unavailable state for invalid or null annual rates", () => {
    const summary = createEmptySummary()
    summary.total_cost_value = 100000
    summary.portfolio_xirr = -100
    summary.benchmark_xirr = null

    render(<PortfolioBenchmarkChart summary={summary} holdings={holdings} />)

    expect(screen.getByText(/portfolio xirr unavailable\/invalid/i)).toBeInTheDocument()
    expect(screen.getByText(/benchmark xirr unavailable\/invalid/i)).toBeInTheDocument()
  })
})
