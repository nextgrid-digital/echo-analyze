import { render, screen } from "@testing-library/react"
import { MarketingPreviewViewport } from "../MarketingPreviewViewport"

class ResizeObserverMock {
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    Object.defineProperty(target, "clientWidth", {
      configurable: true,
      value: 640,
    })
    this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver)
  }

  unobserve() {}

  disconnect() {}
}

describe("MarketingPreviewViewport", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders browser chrome and scaled canvas content", () => {
    render(
      <MarketingPreviewViewport title="Test workspace">
        <div data-testid="canvas-content">Preview content</div>
      </MarketingPreviewViewport>
    )

    expect(screen.getByText("Test workspace")).toBeInTheDocument()
    expect(screen.getByTestId("canvas-content")).toBeInTheDocument()
  })
})
