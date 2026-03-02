import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { PortfolioBenchmarkChart } from "../visualizations/PortfolioBenchmarkChart"
import { createEmptySummary } from "@/lib/emptyData"
import type { Holding } from "@/types/api"

const areaChartDataSpy = vi.fn()

vi.mock("recharts", async () => {
  const Mock = ({ children }: { children?: unknown }) => <div>{children as never}</div>
  return {
    AreaChart: ({ children, data }: { children?: unknown; data?: unknown }) => {
      areaChartDataSpy(data)
      return <div>{children as never}</div>
    },
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
  beforeEach(() => {
    areaChartDataSpy.mockClear()
  })

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

  it("shows comparable benchmark coverage when some holdings cannot be benchmarked", () => {
    const summary = createEmptySummary()
    const chartHoldings: Holding[] = [
      {
        fund_family: "AMC A",
        folio: "1",
        scheme_name: "Benchmarked Fund",
        units: 10,
        nav: 100,
        market_value: 100000,
        cost_value: 80000,
        category: "Equity",
        sub_category: "Flexi Cap",
        xirr: 12,
        benchmark_xirr: 10,
        benchmark_name: "Nifty 500 TRI proxy",
        missed_gains: 5000,
        date_of_entry: "2024-01-01",
      },
      {
        fund_family: "AMC B",
        folio: "2",
        scheme_name: "Unbenchmarked Fund",
        units: 10,
        nav: 100,
        market_value: 100000,
        cost_value: 80000,
        category: "Equity",
        sub_category: "Sectoral",
        xirr: 12,
        benchmark_xirr: null,
        benchmark_name: null,
        missed_gains: null,
        date_of_entry: "2024-01-01",
      },
    ]

    render(<PortfolioBenchmarkChart summary={summary} holdings={chartHoldings} />)

    expect(screen.getByText(/chart coverage: 50\.0% of current portfolio value has comparable benchmark data/i)).toBeInTheDocument()
    expect(screen.getByText(/1 holding\(s\) without benchmark data are excluded/i)).toBeInTheDocument()
  })

  it("starts the comparable series at the holding invested value instead of a pre-entry zero point", () => {
    const summary = createEmptySummary()
    const chartHoldings: Holding[] = [
      {
        fund_family: "AMC A",
        folio: "1",
        scheme_name: "Benchmarked Fund",
        units: 10,
        nav: 100,
        market_value: 120000,
        cost_value: 100000,
        category: "Equity",
        sub_category: "Flexi Cap",
        xirr: 12,
        benchmark_xirr: 10,
        benchmark_name: "Nifty 500 TRI proxy",
        missed_gains: 5000,
        date_of_entry: "2024-06-15",
      },
    ]

    render(<PortfolioBenchmarkChart summary={summary} holdings={chartHoldings} />)

    const data = areaChartDataSpy.mock.lastCall?.[0] as Array<{
      benchmark: number
      date: string
      portfolio: number
    }>

    expect(Array.isArray(data)).toBe(true)
    expect(data[0]?.date).toBe("Jun 2024")
    expect(data[0]?.portfolio).toBeCloseTo(100000, 3)
    expect(data[0]?.benchmark).toBeCloseTo(100000, 3)
  })
})