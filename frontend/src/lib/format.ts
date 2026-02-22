// Display helpers (mirror static/index.html logic)

export function toLakhs(num: number | null | undefined): string {
  if (num === null || num === undefined) return "Rs 0"
  const n = Number(num)
  if (Number.isNaN(n)) return "Rs 0"
  if (n >= 100_000) return `Rs ${(n / 100_000).toFixed(2)} Lakhs`
  return `Rs ${n.toLocaleString("en-IN")}`
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0%"
  return `${Number(value).toFixed(1)}%`
}

export function formatMoney(num: number | null | undefined): string {
  if (num === null || num === undefined) return "Rs 0"
  return `Rs ${Number(num).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export function formatCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0.00"
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
