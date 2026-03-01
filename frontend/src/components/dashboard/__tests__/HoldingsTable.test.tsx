import { render, screen } from "@testing-library/react"
import { HoldingsTable } from "../HoldingsTable"
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
    render(
      <HoldingsTable
        holdings={[
          {
            ...baseHolding,
            missed_gains: 5000,
          },
        ]}
        totalMarketValue={100000}
      />,
    )

    expect(screen.queryByText("Abs Returns")).not.toBeInTheDocument()
    expect(screen.getAllByText("-₹5,000.00").length).toBeGreaterThan(0)
  })

  it("shows green missed gains as a positive amount", () => {
    render(
      <HoldingsTable
        holdings={[
          {
            ...baseHolding,
            missed_gains: -2500,
          },
        ]}
        totalMarketValue={100000}
      />,
    )

    expect(screen.getAllByText("+₹2,500.00").length).toBeGreaterThan(0)
  })
})
