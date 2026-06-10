import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { PortfolioBenchmarkChart } from "@/components/dashboard/visualizations/PortfolioBenchmarkChart"
import { PerformanceInsightsCard } from "./PerformanceInsightsCard"
import { PerformanceKpiCards } from "./PerformanceKpiCards"
import { UnderperformingFundsCard } from "./UnderperformingFundsCard"
import type { AnalysisSummary, Holding } from "@/types/api"

interface ClientPerformanceTabProps {
  summary: AnalysisSummary
  holdings: Holding[]
}

export function ClientPerformanceTab({ summary, holdings }: ClientPerformanceTabProps) {
  const performance = summary.performance_summary

  if (!performance) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Analysis</CardTitle>
            <CardDescription>
              No performance data available. Upload a CAS report to see benchmark comparison metrics.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PerformanceKpiCards performance={performance} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Performance vs Benchmark</CardTitle>
                <CardDescription>
                  Illustrative reconstructed comparison path. 1Y buckets use holdings with comparable benchmark data.
                </CardDescription>
              </div>
              <SectionInfoTooltip
                title="Performance vs Benchmark"
                formula={
                  <>
                    Portfolio XIRR vs benchmark XIRR over the analysis period
                  </>
                }
                content={
                  <>
                    Reconstructed portfolio value path compared against a blended benchmark based on scheme-level benchmarks.
                  </>
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            <PortfolioBenchmarkChart summary={summary} holdings={holdings} />
          </CardContent>
        </Card>
        <PerformanceInsightsCard summary={summary} />
      </div>

      <UnderperformingFundsCard holdings={holdings} />
    </div>
  )
}
