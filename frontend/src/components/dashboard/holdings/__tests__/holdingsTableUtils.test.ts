import { describe, expect, it } from "vitest"
import type { Holding } from "@/types/api"
import {
  COMPACT_COLUMN_IDS,
  DETAIL_COLUMN_IDS,
  filterHoldingsByColumnFilters,
  getVisibleColumns,
} from "../holdingsTableUtils"

const equityHolding: Holding = {
  fund_family: "AMC",
  folio: "1",
  scheme_name: "Flexi Fund",
  units: 1,
  nav: 1,
  market_value: 100,
  cost_value: 90,
  category: "Equity",
  sub_category: "Flexi Cap",
  style_category: "Growth",
  xirr: 10,
  benchmark_xirr: 8,
  benchmark_name: "Nifty",
  date_of_entry: "2024-01-01",
}

const debtHolding: Holding = {
  ...equityHolding,
  scheme_name: "Bond Fund",
  category: "Fixed Income",
  sub_category: "Corporate Bond",
}

describe("holdingsTableUtils", () => {
  it("returns compact columns by default", () => {
    const columns = getVisibleColumns(false, false)
    expect(columns.map((col) => col.id)).toEqual(COMPACT_COLUMN_IDS)
  })

  it("adds detail and folio columns when enabled", () => {
    const columns = getVisibleColumns(true, true).map((col) => col.id)
    expect(columns).toContain("folio")
    expect(columns).toContain("benchmark")
    for (const id of DETAIL_COLUMN_IDS) {
      expect(columns).toContain(id)
    }
  })

  it("filters holdings by category", () => {
    const holdings = [equityHolding, debtHolding]
    const filtered = filterHoldingsByColumnFilters(holdings, {
      categories: ["Equity"],
      subCategories: [],
      styles: [],
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.scheme_name).toBe("Flexi Fund")
  })

  it("filters holdings by multiple categories", () => {
    const holdings = [
      equityHolding,
      debtHolding,
      { ...equityHolding, scheme_name: "Gold Fund", category: "Gold" },
    ]
    const filtered = filterHoldingsByColumnFilters(holdings, {
      categories: ["Equity", "Gold"],
      subCategories: [],
      styles: [],
    })
    expect(filtered).toHaveLength(2)
    expect(filtered.map((h) => h.scheme_name)).toEqual(["Flexi Fund", "Gold Fund"])
  })

  it("filters holdings by sub-category", () => {
    const holdings = [
      equityHolding,
      { ...equityHolding, scheme_name: "Large Fund", sub_category: "Large Cap" },
    ]
    const filtered = filterHoldingsByColumnFilters(holdings, {
      categories: [],
      subCategories: ["Flexi Cap"],
      styles: [],
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.scheme_name).toBe("Flexi Fund")
  })

  it("filters holdings by multiple sub-categories", () => {
    const holdings = [
      equityHolding,
      { ...equityHolding, scheme_name: "Large Fund", sub_category: "Large Cap" },
      { ...equityHolding, scheme_name: "Mid Fund", sub_category: "Mid Cap" },
    ]
    const filtered = filterHoldingsByColumnFilters(holdings, {
      categories: [],
      subCategories: ["Flexi Cap", "Mid Cap"],
      styles: [],
    })
    expect(filtered).toHaveLength(2)
    expect(filtered.map((h) => h.scheme_name)).toEqual(["Flexi Fund", "Mid Fund"])
  })
})
