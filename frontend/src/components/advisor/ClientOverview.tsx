import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PortfolioBenchmarkChart } from "@/components/dashboard/visualizations/PortfolioBenchmarkChart"
import { AllocationTargetTable } from "./AllocationTargetTable"
import { ConcentrationSummaryCard } from "./ConcentrationSummaryCard"
import { KpiStatCards } from "./KpiStatCards"
import { PortfolioHealthCard } from "./PortfolioHealthCard"
import { UnderperformingFundsCard } from "./UnderperformingFundsCard"
import type { AnalysisSummary, Holding } from "@/types/api"

interface ClientOverviewProps {
  summary: AnalysisSummary
  holdings: Holding[]
}

export function ClientOverview({ summary, holdings }: ClientOverviewProps) {
  return (
    <div className="space-y-6">
      <KpiStatCards summary={summary} />

      <PortfolioHealthCard summary={summary} reportUrl="/dashboard/report" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Performance vs Benchmark</CardTitle>
            <CardDescription>Illustrative reconstructed comparison path</CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioBenchmarkChart summary={summary} holdings={holdings} />
          </CardContent>
        </Card>
        <AllocationTargetTable summary={summary} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
        <UnderperformingFundsCard holdings={holdings} />
        <ConcentrationSummaryCard summary={summary} />
      </div>
    </div>
  )
}
