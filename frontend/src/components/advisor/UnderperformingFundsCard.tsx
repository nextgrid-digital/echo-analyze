import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatPercent } from "@/lib/format"
import type { Holding } from "@/types/api"

interface UnderperformingFundsCardProps {
  holdings: Holding[]
}

export function UnderperformingFundsCard({ holdings }: UnderperformingFundsCardProps) {
  const topUnderperformers = useMemo(() => {
    return holdings
      .filter(
        (h) =>
          h.benchmark_xirr != null &&
          h.xirr != null &&
          h.xirr < h.benchmark_xirr &&
          h.market_value > 0
      )
      .map((h) => ({
        name: h.scheme_name,
        diff: (h.xirr ?? 0) - (h.benchmark_xirr ?? 0),
        value: h.market_value,
      }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5)
  }, [holdings])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Underperforming Funds</CardTitle>
        <CardDescription>Top 5 vs benchmark (1Y XIRR)</CardDescription>
      </CardHeader>
      <CardContent>
        {topUnderperformers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comparable underperformers found.</p>
        ) : (
          <ul className="space-y-3">
            {topUnderperformers.map((fund) => (
              <li
                key={fund.name}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{fund.name}</span>
                <span className="shrink-0 font-mono text-rose-600">
                  {formatPercent(fund.diff)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
