import { renderWithProviders as render, screen } from "@/test/render"
import { ProgressBarWithLabel } from "../visualizations/ProgressBarWithLabel"

describe("ProgressBarWithLabel", () => {
  it("clamps invalid and negative values to a safe width", () => {
    const { container, rerender } = render(
      <ProgressBarWithLabel value={Number.NaN} label="Risk" />
    )

    expect(screen.getByText("0.0%")).toBeInTheDocument()
    const indicator = container.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: "translateX(-100%)" })

    rerender(<ProgressBarWithLabel value={-25} max={100} label="Risk" />)

    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveStyle({
      transform: "translateX(-100%)",
    })
  })
})
