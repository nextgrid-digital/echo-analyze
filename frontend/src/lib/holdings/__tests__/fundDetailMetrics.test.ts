import { describe, expect, it } from "vitest"
import type { Holding } from "@/types/api"
import {
  buildIllustrativeNews,
  getFundWeightPct,
  getPerformanceStatus,
  getXirrDelta,
} from "../fundDetailMetrics"

const holding: Holding = {
  fund_family: "HDFC Mutual Fund",
  folio: "1",
  scheme_name: "HDFC Flexi Cap Fund",
  amfi: "100033",
  units: 10,
  nav: 100,
  market_value: 1000,
  cost_value: 800,
  category: "Equity",
  sub_category: "Flexi Cap",
  xirr: 14,
  benchmark_xirr: 12,
  benchmark_name: "Nifty 500 TRI",
}

describe("fundDetailMetrics", () => {
  it("calculates portfolio weight", () => {
    expect(getFundWeightPct(holding, 5000)).toBe(20)
  })

  it("derives performance status from xirr delta", () => {
    expect(getXirrDelta(holding)).toBe(2)
    expect(getPerformanceStatus(holding)).toBe("outperforming")
    expect(getPerformanceStatus({ ...holding, xirr: 12, benchmark_xirr: 12 })).toBe("neutral")
    expect(getPerformanceStatus({ ...holding, xirr: null, benchmark_xirr: 12 })).toBe("unknown")
  })

  it("builds illustrative news items", () => {
    const items = buildIllustrativeNews(holding)
    expect(items.length).toBeGreaterThanOrEqual(3)
    expect(items[0]?.title).toContain("Flexi Cap")
  })
})
