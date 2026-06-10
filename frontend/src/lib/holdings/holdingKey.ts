import type { Holding } from "@/types/api"

function slugifySchemeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export function buildHoldingKey(holding: Holding): string {
  const amfi = holding.amfi?.trim()
  if (amfi) {
    return encodeURIComponent(amfi)
  }
  const folio = holding.folio?.trim() || "unknown-folio"
  const scheme = slugifySchemeName(holding.scheme_name || "unknown-scheme")
  return encodeURIComponent(`${folio}|${scheme}`)
}

export function findHoldingByKey(holdings: Holding[], key: string): Holding | undefined {
  const decoded = decodeURIComponent(key)
  return holdings.find((holding) => {
    const amfi = holding.amfi?.trim()
    if (amfi && amfi === decoded) return true
    return buildHoldingKey(holding) === key || buildHoldingKey(holding) === decoded
  })
}

export function buildFundDetailPath(key: string): string {
  return `/dashboard/holdings/${key}`
}

export function buildHoldingsTabPath(pan: string): string {
  return `/clients/${encodeURIComponent(pan)}?tab=holdings`
}
