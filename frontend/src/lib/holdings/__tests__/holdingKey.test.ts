import { describe, expect, it } from "vitest"
import type { Holding } from "@/types/api"
import {
  buildFundDetailPath,
  buildHoldingKey,
  buildHoldingsTabPath,
  findHoldingByKey,
} from "../holdingKey"

const holdingWithAmfi: Holding = {
  fund_family: "HDFC",
  folio: "123",
  scheme_name: "HDFC Flexi Cap Fund",
  amfi: "100033",
  units: 1,
  nav: 100,
  market_value: 1000,
  cost_value: 900,
  category: "Equity",
  sub_category: "Flexi Cap",
}

const holdingWithoutAmfi: Holding = {
  ...holdingWithAmfi,
  amfi: null,
  folio: "999/88",
  scheme_name: "Custom Scheme Name",
}

describe("holdingKey", () => {
  it("uses amfi code when available", () => {
    expect(buildHoldingKey(holdingWithAmfi)).toBe("100033")
  })

  it("falls back to folio and scheme slug", () => {
    expect(buildHoldingKey(holdingWithoutAmfi)).toBe(
      encodeURIComponent("999/88|custom-scheme-name")
    )
  })

  it("finds holding by amfi key", () => {
    const key = buildHoldingKey(holdingWithAmfi)
    expect(findHoldingByKey([holdingWithAmfi, holdingWithoutAmfi], key)?.scheme_name).toBe(
      "HDFC Flexi Cap Fund"
    )
  })

  it("finds holding by fallback key", () => {
    const key = buildHoldingKey(holdingWithoutAmfi)
    expect(findHoldingByKey([holdingWithAmfi, holdingWithoutAmfi], key)?.folio).toBe("999/88")
  })

  it("builds detail and holdings tab paths", () => {
    expect(buildFundDetailPath("100033")).toBe("/dashboard/holdings/100033")
    expect(buildHoldingsTabPath("ABCDE1234F")).toBe("/clients/ABCDE1234F?tab=holdings")
  })
})
