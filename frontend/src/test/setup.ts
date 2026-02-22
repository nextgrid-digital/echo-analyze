import "@testing-library/jest-dom/vitest"

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Recharts expects ResizeObserver in JSDOM tests.
if (!globalThis.ResizeObserver) {
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock
}
