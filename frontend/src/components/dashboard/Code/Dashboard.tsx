import { Suspense, lazy } from "react"
import { TopCards } from "./TopCards"
import { Concentration } from "./Concentration"
import { Cost } from "./Cost"
import { EquityDeepDive } from "./EquityDeepDive"
import { AssetAllocation } from "./AssetAllocation"
import { FixedIncome } from "./FixedIncome"
import { Performance } from "./Performance"
import { FundOverlap } from "./FundOverlap"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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
    <div className="h-48 rounded-2xl bg-muted animate-pulse" />
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

      {summary.overlap &&
        summary.overlap.fund_codes.length >= 2 &&
        summary.overlap.matrix.length >= 2 && (
          <FundOverlap overlap={summary.overlap} />
        )}

      <div className="mb-12">
        <Card className="bg-card border border-border overflow-hidden">
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
                className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring"
              />
            </div>
            <div className="absolute -top-24 -right-24 size-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 size-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2 text-card-foreground">
                Expert <span className="text-primary">Feedback</span>
              </h2>
              <p className="text-muted-foreground text-sm font-medium mb-8">
                Personalized observations and recommendations based on the
                portfolio analysis.
              </p>
              <div className="bg-muted/50 backdrop-blur-md rounded-2xl p-6 border border-border">
                <Textarea
                  rows={6}
                  className="w-full min-h-[120px] bg-background border-input text-foreground placeholder:text-muted-foreground text-base sm:text-lg leading-relaxed resize-none"
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
