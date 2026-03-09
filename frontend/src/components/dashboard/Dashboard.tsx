import { HoldingsTable } from "./HoldingsTable"
import { TopCards } from "./TopCards"
import { Concentration } from "./Concentration"
import { EquityDeepDive } from "./EquityDeepDive"
import { AssetAllocation } from "./AssetAllocation"
import { FixedIncome } from "./FixedIncome"
import { Performance } from "./Performance"
import { FundOverlap } from "./FundOverlap"
import { WideCard } from "./cards/WideCard"
import { PortfolioBenchmarkChart } from "./visualizations/PortfolioBenchmarkChart"
import { ExecutiveSummary } from "./ExecutiveSummary"
import { RiskMetrics } from "./RiskMetrics"
import { KeyObservations } from "./KeyObservations"
import { AllocationGapAnalysis } from "./AllocationGapAnalysis"
import { InvestorDetails } from "./InvestorDetails"
import { Textarea } from "@/components/ui/textarea"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Skeleton } from "@/components/ui/skeleton"
import type { AnalysisSummary, Holding } from "@/types/api"

interface DashboardProps {
  summary: AnalysisSummary
  holdings: Holding[]
}

export function SkeletonDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16 sm:pb-20 opacity-60">
      {/* Top Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
        <Skeleton className="h-40 w-full rounded-none" />
        <Skeleton className="h-40 w-full rounded-none" />
      </div>

      {/* Grid of 4 Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Skeleton className="h-80 w-full rounded-none" />
        <Skeleton className="h-80 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
      </div>

      {/* Large Feedback Skeleton */}
      <Skeleton className="h-64 w-full rounded-none mb-12" />

      {/* Table Skeleton */}
      <Skeleton className="h-96 w-full rounded-none" />
    </div>
  )
}

export function Dashboard({ summary, holdings }: DashboardProps) {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 sm:pb-16">
      <div className="flex gap-6 lg:gap-8">
        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Investor Details - At the top */}
          {summary.investor_info && (
            <div className="mb-6 sm:mb-8">
              <InvestorDetails investorInfo={summary.investor_info} />
            </div>
          )}

          {/* Section 1: Executive Summary */}
          <section
            id="executive-summary"
            className="scroll-mt-24 section-spacing pdf-section"
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-section-header text-foreground mb-1">
                Executive Summary
              </h2>
              <p className="text-sm text-muted-foreground">
                Key portfolio metrics and insights at a glance
              </p>
            </div>

            {/* Key Metrics Bar */}
            <TopCards summary={summary} />

            {/* Portfolio vs Benchmark Chart */}
            <div className="mt-6 sm:mt-8">
              <WideCard>
                <div className="relative">
                  <div className="absolute top-0 right-0">
                    <SectionInfoTooltip
                      title="Portfolio Performance vs Benchmark"
                      formula={
                        <>
                          Reconstructed Holding Value(t) = entry value interpolated to current value by today<br />
                          Benchmark uses only holdings with comparable benchmark data<br />
                          Difference = Portfolio - Benchmark
                        </>
                      }
                      content={
                        <>
                          This chart shows an illustrative, reconstructed comparison path based on holding entry dates, invested values, and current values. It is not a transaction-level historical valuation series.
                        </>
                      }
                    />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-6">
                    Portfolio Performance vs Benchmark
                  </h3>
                  <PortfolioBenchmarkChart summary={summary} holdings={holdings} />
                </div>
              </WideCard>
            </div>

            {/* Key Insights Summary */}
            <div className="mt-6 sm:mt-8">
              <ExecutiveSummary summary={summary} />
            </div>
          </section>

          {/* Section 2: Risk & Performance Analysis */}
          <section
            id="risk-performance"
            className="scroll-mt-24 section-spacing pdf-section"
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-section-header text-foreground mb-1">
                Risk & Performance Analysis
              </h2>
              <p className="text-sm text-muted-foreground">
                Risk metrics, performance attribution, and underperformance analysis
              </p>
            </div>

            {/* Risk Metrics */}
            <div id="risk-metrics" className="scroll-mt-24 mb-6 sm:mb-8">
              <RiskMetrics summary={summary} />
            </div>

            {/* Performance Attribution / Underperformance Analysis */}
            <div id="performance-analysis-performance-summary" className="scroll-mt-24 mb-6 sm:mb-8">
              <Performance
                performance={
                  summary.performance_summary ?? {
                    one_year: {
                      comparable_pct: 0,
                      underperforming_pct: 0,
                      upto_3_pct: 0,
                      more_than_3_pct: 0,
                    },
                    three_year: {
                      comparable_pct: 0,
                      underperforming_pct: 0,
                      upto_3_pct: 0,
                      more_than_3_pct: 0,
                    },
                  }
                }
              />
            </div>
          </section>

          {/* Section 3: Portfolio Health & Structure */}
          <section
            id="portfolio-health"
            className="scroll-mt-24 section-spacing pdf-section"
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-section-header text-foreground mb-1">
                Portfolio Health & Structuring
              </h2>
              <p className="text-sm text-muted-foreground">
                Asset allocation, concentration, and diversification analysis
              </p>
            </div>

            {/* Asset Allocation */}
            <div id="portfolio-structure-asset-allocation" className="scroll-mt-24 mb-6 sm:mb-8">
              <AssetAllocation summary={summary} holdings={holdings} />
            </div>

            {/* Allocation Gap Analysis */}
            {summary.guidelines?.investment_guidelines && (
              <div className="mb-6 sm:mb-8">
                <AllocationGapAnalysis summary={summary} />
              </div>
            )}

            {/* Concentration Analysis */}
            <div id="portfolio-structure-concentration" className="scroll-mt-24 mb-6 sm:mb-8">
              <Concentration concentration={summary.concentration} />
            </div>
          </section>

          {/* Section 4: Equity Portfolio Deep Dive */}
          <section
            id="equity-portfolio-deep-dive"
            className="scroll-mt-24 section-spacing pdf-section"
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-section-header text-foreground mb-1">
                Equity Portfolio Deep Dive
              </h2>
              <p className="text-sm text-muted-foreground">
                Detailed equity-only performance, allocation, and benchmark comparison
              </p>
            </div>
            <EquityDeepDive summary={summary} />
          </section>

          {/* Section 5: Fixed Income Analysis */}
          <section
            id="fixed-income"
            className="scroll-mt-24 section-spacing pdf-section"
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-section-header text-foreground mb-1">
                Fixed Income Analysis
              </h2>
              <p className="text-sm text-muted-foreground">
                Fixed income holdings and debt allocation quality
              </p>
            </div>
            <FixedIncome
              fixedIncome={
                summary.fixed_income ?? {
                  invested_value: 0,
                  current_value: 0,
                  irr: null,
                  ytm: null,
                  credit_quality: { aaa_pct: 0, aa_pct: 0, below_aa_pct: 0 },
                  top_funds: [],
                  top_amcs: [],
                  category_allocation: [],
                }
              }
            />
          </section>

          {/* Section 6: Proposed Allocation */}
          <section
            id="detailed-holdings"
            className="scroll-mt-24 section-spacing pdf-section"
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-section-header text-foreground mb-1">
                Proposed Allocation
              </h2>
              <p className="text-sm text-muted-foreground">
                Complete holdings breakdown for detailed review
              </p>
            </div>
            <HoldingsTable
              holdings={holdings}
              totalMarketValue={summary.total_market_value}
            />
          </section>

          {/* Section 7: Overlapping Holdings */}
          <section
            id="overlapping-holdings"
            className="scroll-mt-24 section-spacing pdf-section"
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-section-header text-foreground mb-1">
                Overlapping Holdings
              </h2>
              <p className="text-sm text-muted-foreground">
                Scheme overlap and diversification across your portfolio
              </p>
            </div>
            <FundOverlap
              overlap={
                summary.overlap ?? {
                  fund_codes: [],
                  fund_names: [],
                  matrix: [],
                }
              }
            />
          </section>

          {/* Section 8: Key Observations */}
          <section
            id="key-observations"
            className="scroll-mt-24 section-spacing pdf-section"
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-section-header text-foreground mb-1">
                Key Observations
              </h2>
              <p className="text-sm text-muted-foreground">
                Important data highlights organized by category
              </p>
            </div>
            <KeyObservations summary={summary} />
          </section>

          {/* Notes & Feedback Section */}
          <section
            id="notes-feedback"
            className="scroll-mt-24 section-spacing pdf-section"
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-section-header text-foreground mb-1">
                Notes & Feedback
              </h2>
              <p className="text-sm text-muted-foreground">
                Expert feedback and personalized observations
              </p>
            </div>
            <WideCard>
              <div className="relative">
                <div className="absolute top-0 right-0 z-20">
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
                <div className="relative z-10">
                  <div className="bg-muted/50 backdrop-blur-md rounded-none p-4 border border-border">
                    <Textarea
                      rows={6}
                      className="w-full min-h-[120px] bg-background border-input text-foreground placeholder:text-muted-foreground text-sm sm:text-base leading-relaxed resize-none"
                      placeholder="Write your professional feedback here... (e.g., 'Consider shifting some debt allocation to large cap for better long-term growth.')"
                    />
                  </div>
                </div>
              </div>
            </WideCard>
          </section>
        </main>
      </div>
    </div>
  )
}
