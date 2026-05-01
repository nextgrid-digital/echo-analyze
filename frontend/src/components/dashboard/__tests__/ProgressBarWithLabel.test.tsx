import { render, screen } from "@testing-library/react"
import { ProgressBarWithLabel } from "../visualizations/ProgressBarWithLabel"

describe("ProgressBarWithLabel", () => {
  it("clamps invalid and negative values to a safe width", () => {
    const { container, rerender } = render(
      <ProgressBarWithLabel value={Number.NaN} label="Risk" />,
    )

    expect(screen.getByText("0.0%")).toBeInTheDocument()
    expect(container.querySelector("[style]")).toHaveStyle({ width: "0%" })

    rerender(<ProgressBarWithLabel value={-25} max={100} label="Risk" />)

    expect(container.querySelector("[style]")).toHaveStyle({ width: "0%" })
  })
})
