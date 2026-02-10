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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { AnalysisSummary, Holding } from "@/types/api"

const HoldingsTableLazy = lazy(() =>
  import("./HoldingsTable").then((m) => ({ default: m.HoldingsTable }))
)

interface DashboardProps {
  summary: AnalysisSummary
  holdings: Holding[]
}

export function SkeletonDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16 sm:pb-20 opacity-60">
      {/* Top Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>

      {/* Grid of 4 Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>

      {/* Large Feedback Skeleton */}
      <Skeleton className="h-64 w-full rounded-2xl mb-12" />

      {/* Table Skeleton */}
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  )
}

export function Dashboard({ summary, holdings }: DashboardProps) {
  console.log("Dashboard Summary:", summary);
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


      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <HoldingsTableLazy
          holdings={holdings}
          totalMarketValue={summary.total_market_value}
        />
      </Suspense>

      <div className="mt-12 flex justify-center no-print">
        <Button
          type="button"
          variant="default"
          onClick={() => window.print()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] py-3 px-10 rounded-xl shadow-xl shadow-primary/20 flex items-center gap-3 text-lg font-bold transition-all hover:scale-105 active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Download Entire Portfolio PDF
        </Button>
      </div>
    </div>
  )
}
