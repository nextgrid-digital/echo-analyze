import { Suspense, lazy } from "react"
import { TopCards } from "./TopCards"
import { Concentration } from "./Concentration"
import { Cost } from "./Cost"
import { EquityDeepDive } from "./EquityDeepDive"
import { AssetAllocation } from "./AssetAllocation"
import { FixedIncome } from "./FixedIncome"
import { Performance } from "./Performance"
import { Card, CardContent } from "@/components/ui/card"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import type { AnalysisSummary, Holding } from "@/types/api"

const GuidelinesLazy = lazy(() =>
  import("./Guidelines").then((m) => ({ default: m.Guidelines }))
)
const HoldingsTableLazy = lazy(() =>
  import("./HoldingsTable").then((m) => ({ default: m.HoldingsTable }))
)

interface DashboardProps {
  summary: AnalysisSummary
  holdings: Holding[]
}

function DashboardSkeleton() {
  return (
    <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
  )
}

export function Dashboard({ summary, holdings }: DashboardProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16 sm:pb-20">
      <TopCards summary={summary} />
      <Concentration concentration={summary.concentration} />
      <Cost cost={summary.cost} />
      <EquityDeepDive summary={summary} />
      <AssetAllocation summary={summary} />

      {summary.fixed_income && (
        <FixedIncome fixedIncome={summary.fixed_income} />
      )}

      {summary.performance_summary && (
        <Performance performance={summary.performance_summary} />
      )}

      <div className="mb-12">
        <Card className="bg-indigo-900 border-0 text-white overflow-hidden">
          <CardContent className="p-6 sm:p-10 relative">
            <div className="absolute top-6 right-6 z-20">
              <SectionInfoTooltip
                title="Expert Feedback"
                content={
                  <>
                    Personalized observations and recommendations based on the
                    portfolio analysis. Use this area to note advisor or AI-generated
                    feedback (e.g. rebalancing, cost savings, concentration).
                  </>
                }
                side="left"
                className="text-white/80 hover:bg-white/20 hover:text-white focus-visible:ring-white/50"
              />
            </div>
            <div className="absolute -top-24 -right-24 size-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 size-64 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">
                Expert <span className="text-emerald-400">Feedback</span>
              </h2>
              <p className="text-indigo-200 text-sm font-medium mb-8">
                Personalized observations and recommendations based on the
                portfolio analysis.
              </p>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <textarea
                  rows={6}
                  className="w-full min-h-[120px] bg-transparent border-none text-white placeholder-indigo-300 focus:ring-0 text-base sm:text-lg leading-relaxed resize-none"
                  placeholder="Write your professional feedback here... (e.g., 'Consider shifting some debt allocation to large cap for better long-term growth.')"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {summary.guidelines && (
        <Suspense fallback={<DashboardSkeleton />}>
          <GuidelinesLazy guidelines={summary.guidelines} />
        </Suspense>
      )}

      <Suspense fallback={<DashboardSkeleton />}>
        <HoldingsTableLazy
          holdings={holdings}
          totalMarketValue={summary.total_market_value}
        />
      </Suspense>
    </div>
  )
}
