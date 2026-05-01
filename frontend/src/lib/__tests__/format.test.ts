import { formatCurrency, formatMoney, formatPercent, toLakhs } from "@/lib/format"

describe("format helpers", () => {
  it("falls back to zero for non-finite numeric values", () => {
    expect(formatCurrency(Number.NaN)).toBe("0.00")
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe("Rs 0")
    expect(formatPercent(Number.NEGATIVE_INFINITY)).toBe("0.0%")
    expect(toLakhs(Number.NaN)).toBe("Rs 0")
  })
})
