import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getBenchmarkName } from "@/components/dashboard/holdings/holdingsTableUtils"
import type { Holding } from "@/types/api"

interface FundClassificationCardProps {
  holding: Holding
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  )
}

export function FundClassificationCard({ holding }: FundClassificationCardProps) {
  const benchmarkName = getBenchmarkName(holding)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Classification & identifiers</CardTitle>
        <CardDescription>Fund metadata from the latest CAS analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <dl>
          <DetailRow label="Category" value={holding.category} />
          <DetailRow label="Sub-category" value={holding.sub_category} />
          <DetailRow label="Style" value={holding.style_category || "—"} />
          <DetailRow label="Benchmark" value={benchmarkName} />
          <DetailRow label="AMFI code" value={holding.amfi?.trim() || "—"} />
          <DetailRow label="AMC" value={holding.fund_family} />
          <DetailRow label="Folio" value={holding.folio || "—"} />
        </dl>
      </CardContent>
    </Card>
  )
}
