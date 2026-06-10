import { MOCK_BOOK_CLIENTS } from "@/lib/marketing/fixtures"

function formatAum(value: number) {
  if (value >= 100_000) {
    return `₹${(value / 100_000).toFixed(2)} Cr`
  }
  return `₹${value.toLocaleString("en-IN")}`
}

export function ClientBookMiniPreview() {
  const clients = MOCK_BOOK_CLIENTS.slice(0, 3)

  return (
    <div className="bg-background p-6">
      <div className="mb-4">
        <p className="text-base font-semibold tracking-tight">Clients</p>
        <p className="mt-1 text-sm text-muted-foreground">Your practice at a glance</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Client</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">AUM</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">XIRR</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const aum = client.analysis.summary?.total_market_value ?? 0
              const xirr = client.analysis.summary?.portfolio_xirr
              return (
                <tr key={client.pan} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{client.name}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatAum(aum)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-emerald-600">
                    {xirr != null ? `+${xirr.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
