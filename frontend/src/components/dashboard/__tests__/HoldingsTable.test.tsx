import type { ReactElement } from "react"
import { fireEvent, renderWithProviders as render, screen } from "@/test/render"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { HoldingsTable } from "../HoldingsTable"

function renderHoldingsTable(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}
import type { Holding } from "@/types/api"

const baseHolding: Holding = {
  fund_family: "AMC A",
  folio: "12345",
  scheme_name: "Test Flexi Cap Fund",
  units: 100,
  nav: 100,
  market_value: 100000,
  cost_value: 90000,
  category: "Equity",
  sub_category: "Flexi Cap",
  xirr: 12,
  benchmark_xirr: 10,
  benchmark_name: "Nifty 500 TRI proxy",
  date_of_entry: "2024-01-01",
}

describe("HoldingsTable", () => {
  it("removes the abs returns column and shows red missed gains as a negative amount", () => {
    renderHoldingsTable(
      <HoldingsTable
        holdings={[
          {
            ...baseHolding,
            missed_gains: 5000,
          },
        ]}
        totalMarketValue={100000}
      />
    )

    expect(screen.queryByText("Abs Returns")).not.toBeInTheDocument()
    expect(screen.getAllByText("-Rs 5,000.00").length).toBeGreaterThan(0)
  })

  it("shows green missed gains as a positive amount", () => {
    renderHoldingsTable(
      <HoldingsTable
        holdings={[
          {
            ...baseHolding,
            missed_gains: -2500,
          },
        ]}
        totalMarketValue={100000}
      />
    )

    expect(screen.getAllByText("+Rs 2,500.00").length).toBeGreaterThan(0)
  })

  it("renders compact columns by default without benchmark or entry date", () => {
    renderHoldingsTable(<HoldingsTable holdings={[baseHolding]} totalMarketValue={100000} />)

    expect(screen.getByText("Portfolio holdings")).toBeInTheDocument()
    expect(screen.getByText("Fund name")).toBeInTheDocument()
    expect(screen.getByText("Sub-category")).toBeInTheDocument()
    expect(screen.queryByText("Benchmark")).not.toBeInTheDocument()
    expect(screen.queryByText("Entry date")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Filter Category")).toBeInTheDocument()
    expect(screen.getByLabelText("Filter Sub-category")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Equity" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Debt" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /table actions/i })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="table"]')).toBeInTheDocument()
  })

  it("shows detail columns when defaultShowDetails is enabled", () => {
    renderHoldingsTable(
      <HoldingsTable
        holdings={[baseHolding]}
        totalMarketValue={100000}
        defaultShowDetails
      />
    )

    expect(screen.getByText("Benchmark")).toBeInTheDocument()
    expect(screen.getByText("Entry date")).toBeInTheDocument()
    expect(screen.getByLabelText("Filter Style")).toBeInTheDocument()
  })

  it("shows benchmark fallback when benchmark_name is missing", () => {
    renderHoldingsTable(
      <HoldingsTable
        holdings={[{ ...baseHolding, benchmark_name: null }]}
        totalMarketValue={100000}
        defaultShowDetails
      />
    )

    expect(screen.getByText("Nifty 500 Total Return Index")).toBeInTheDocument()
  })

  it("renders XIRR and benchmark XIRR values in the table", () => {
    renderHoldingsTable(
      <HoldingsTable
        holdings={[baseHolding]}
        totalMarketValue={100000}
        defaultShowDetails
      />
    )

    expect(screen.getByText("12.0%")).toBeInTheDocument()
    expect(screen.getByText("10.00%")).toBeInTheDocument()
  })

  it("allows horizontal scrolling for wide tables", () => {
    renderHoldingsTable(<HoldingsTable holdings={[baseHolding]} totalMarketValue={100000} />)

    const scrollContainer = document.querySelector(".print-full-table")
    expect(scrollContainer).toHaveClass("overflow-x-auto")
  })

  it("shows folio column when defaultShowFolio is enabled", () => {
    renderHoldingsTable(
      <HoldingsTable
        holdings={[baseHolding]}
        totalMarketValue={100000}
        defaultShowFolio
      />
    )

    expect(screen.getByText("Folio")).toBeInTheDocument()
  })

  it("navigates to fund detail when a holding row is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <HoldingsTable
                holdings={[{ ...baseHolding, amfi: "999999" }]}
                totalMarketValue={100000}
              />
            }
          />
          <Route path="/dashboard/holdings/:holdingKey" element={<div>Fund detail page</div>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(
      screen.getByRole("link", { name: /view details for test flexi cap fund/i })
    )

    expect(screen.getByText("Fund detail page")).toBeInTheDocument()
  })

  it("embedded variant omits the card title", () => {
    renderHoldingsTable(
      <HoldingsTable
        holdings={[baseHolding]}
        totalMarketValue={100000}
        variant="embedded"
      />
    )

    expect(screen.queryByText("Portfolio holdings")).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="table"]')).toBeInTheDocument()
  })
})
