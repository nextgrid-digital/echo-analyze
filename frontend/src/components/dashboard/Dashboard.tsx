import { DashboardSectionHeader } from "./DashboardSectionHeader"
import { getSectionPanelClass } from "@/lib/dashboardTheme"
import { cn } from "@/lib/utils"
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
import { Cost } from "./Cost"
import { TaxAnalysis } from "./TaxAnalysis"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      <Skeleton className="h-64 w-full rounded-xl mb-12" />
      <Skeleton className="h-96 w-full rounded-xl" />
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
              <InvestorDetails
                investorInfo={summary.investor_info}
                statementDate={summary.statement_date}
                portfolioValue={summary.total_market_value}
                portfolioReturn={summary.portfolio_return ?? undefined}
              />
            </div>
          )}

          {/* Section 1: Executive Summary */}
          <section
            id="executive-summary"
            className={cn(
              "scroll-mt-24 section-spacing pdf-section dashboard-section-panel rounded-2xl p-5 sm:p-7",
              getSectionPanelClass("emerald")
            )}
          >
            <DashboardSectionHeader
              index={1}
              accent="emerald"
              title="Executive Summary"
              description="Key portfolio metrics and insights at a glance"
            />

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
                  <h3 className="mb-6 text-base font-semibold tracking-tight text-foreground sm:text-lg">
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
            className={cn(
              "scroll-mt-24 section-spacing pdf-section dashboard-section-panel rounded-2xl p-5 sm:p-7",
              getSectionPanelClass("sky")
            )}
          >
            <DashboardSectionHeader
              index={2}
              accent="sky"
              title="Risk & Performance Analysis"
              description="Risk metrics, performance attribution, and underperformance analysis"
            />

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

            {/* Equity Deep Dive */}
            <div id="performance-analysis-equity-deep-dive" className="scroll-mt-24">
              <EquityDeepDive summary={summary} />
            </div>
          </section>

          {/* Section 3: Portfolio Health & Structure */}
          <section
            id="portfolio-health"
            className={cn(
              "scroll-mt-24 section-spacing pdf-section dashboard-section-panel rounded-2xl p-5 sm:p-7",
              getSectionPanelClass("violet")
            )}
          >
            <DashboardSectionHeader
              index={3}
              accent="violet"
              title="Portfolio Health & Structure"
              description="Asset allocation, concentration, and diversification analysis"
            />

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

            {/* Fund Overlap / Diversification */}
            <div id="diversification" className="scroll-mt-24">
              <FundOverlap
                overlap={
                  summary.overlap ?? {
                    fund_codes: [],
                    fund_names: [],
                    matrix: [],
                  }
                }
              />
            </div>
          </section>

          {/* Section 4: Cost & Tax Analysis */}
          <section
            id="cost-tax-analysis"
            className={cn(
              "scroll-mt-24 section-spacing pdf-section dashboard-section-panel rounded-2xl p-5 sm:p-7",
              getSectionPanelClass("amber")
            )}
          >
            <DashboardSectionHeader
              index={4}
              accent="amber"
              title="Cost & Tax Analysis"
              description="Portfolio costs, expenses, and tax implications"
            />

            {/* Tax Analysis */}
            <div className="mb-6 sm:mb-8">
              <Cost cost={summary.cost} />
            </div>

            {/* Tax Analysis */}
            <div>
              <TaxAnalysis summary={summary} />
            </div>
          </section>

          {/* Section 5: Fixed Income Analysis */}
          <section
            id="fixed-income"
            className={cn(
              "scroll-mt-24 section-spacing pdf-section dashboard-section-panel rounded-2xl p-5 sm:p-7",
              getSectionPanelClass("indigo")
            )}
          >
            <DashboardSectionHeader
              index={5}
              accent="indigo"
              title="Fixed Income Analysis"
              description="Fixed income holdings and debt allocation quality"
            />
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

          {/* Section 7: Key Observations */}
          <section
            id="key-observations"
            className={cn(
              "scroll-mt-24 section-spacing pdf-section dashboard-section-panel rounded-2xl p-5 sm:p-7",
              getSectionPanelClass("rose")
            )}
          >
            <DashboardSectionHeader
              index={6}
              accent="rose"
              title="Key Observations"
              description="Important data highlights organized by category"
            />
            <KeyObservations summary={summary} />
          </section>

          {/* Section 8: Detailed Holdings (Reference) */}
          <section
            id="detailed-holdings"
            className={cn(
              "scroll-mt-24 section-spacing pdf-section dashboard-section-panel rounded-2xl p-5 sm:p-7",
              getSectionPanelClass("cyan")
            )}
          >
            <DashboardSectionHeader
              index={7}
              accent="cyan"
              title="Proposed Allocation"
              description="Complete holdings breakdown for detailed review"
            />
            <HoldingsTable
              holdings={holdings}
              totalMarketValue={summary.total_market_value}
              variant="embedded"
            />
          </section>

          {/* Notes & Feedback Section */}
          <section
            id="notes-feedback"
            className={cn(
              "scroll-mt-24 section-spacing pdf-section dashboard-section-panel rounded-2xl p-5 sm:p-7",
              getSectionPanelClass("fuchsia")
            )}
          >
            <DashboardSectionHeader
              index={8}
              accent="fuchsia"
              title="Notes & Feedback"
              description="Expert feedback and personalized observations"
            />
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
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
                    <Textarea
                      rows={6}
                      className="w-full min-h-[120px] resize-none rounded-lg border-border bg-card text-sm leading-relaxed text-foreground placeholder:text-muted-foreground sm:text-base"
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
