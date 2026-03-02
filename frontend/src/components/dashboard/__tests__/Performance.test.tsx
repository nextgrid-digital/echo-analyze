import { render, screen } from "@testing-library/react"
import { Performance } from "../Performance"

describe("Performance", () => {
  it("derives performing percentage from comparable coverage instead of assuming uncovered holdings are performing", () => {
    render(
      <Performance
        performance={{
          one_year: {
            comparable_pct: 60,
            underperforming_pct: 20,
            upto_3_pct: 8,
            more_than_3_pct: 12,
          },
          three_year: {
            comparable_pct: 55,
            underperforming_pct: 18,
            upto_3_pct: 7,
            more_than_3_pct: 11,
          },
        }}
      />,
    )

    expect(screen.getByText("40.0%")).toBeInTheDocument()
    expect(screen.getByText("Comparable coverage: 60.0%")).toBeInTheDocument()
    expect(screen.queryByText("80.0%")).not.toBeInTheDocument()
  })
})