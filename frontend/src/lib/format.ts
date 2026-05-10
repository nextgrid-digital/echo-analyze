// Display helpers (mirror static/index.html logic)

function toFiniteNumber(value: number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toLakhs(num: number | null | undefined): string {
  const n = toFiniteNumber(num)
  if (n >= 100_000) return `Rs ${(n / 100_000).toFixed(2)} Lakhs`
  return `Rs ${n.toLocaleString("en-IN")}`
}

export function formatPercent(value: number | null | undefined): string {
  return `${toFiniteNumber(value).toFixed(1)}%`
}

export function formatMoney(num: number | null | undefined): string {
  return `Rs ${toFiniteNumber(num).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export function formatCurrency(num: number | null | undefined): string {
  return toFiniteNumber(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
