import { Link } from "react-router-dom"
import { DataSourcesSection } from "@/components/marketing/DataSourcesSection"
import { EchoHero } from "@/components/marketing/EchoHero"
import { FeatureGrid } from "@/components/marketing/FeatureGrid"
import { MarketingSection, SectionHeading } from "@/components/marketing/MarketingSection"
import {
  ClientBookPreview,
  InsightsPreview,
  KpiStripPreviewFrame,
  PerformanceChartPreviewFrame,
  WorkspaceSlicePreviewFrame,
} from "@/components/marketing/ProductPreviews"
import { ProductMosaic } from "@/components/marketing/ProductMosaic"
import { RoadmapColumns } from "@/components/marketing/RoadmapColumns"
import { StepFlow } from "@/components/marketing/StepFlow"
import { MarketingLayout } from "@/components/MarketingLayout"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const FEATURES = [
  {
    title: "Portfolio Intelligence",
    description: "Understand every portfolio instantly.",
  },
  {
    title: "Opportunity Discovery",
    description: "Identify investable opportunities across client accounts.",
  },
  {
    title: "Meeting Preparation",
    description: "Generate talking points before every review.",
  },
  {
    title: "Client Reviews",
    description: "Share beautiful review experiences with clients.",
  },
  {
    title: "Benchmark Intelligence",
    description: "Understand performance in context.",
  },
  {
    title: "Advisor Workspace",
    description: "Keep everything in one place.",
  },
] as const

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Upload a statement",
    description: "Bring portfolio data from CAMS into ECHO.",
  },
  {
    step: "02",
    title: "Reconstruct the portfolio",
    description: "ECHO maps holdings, benchmarks, and allocation.",
  },
  {
    step: "03",
    title: "Act on what matters",
    description: "Reviews, opportunities, and talking points surface automatically.",
  },
] as const

const ROADMAP_TODAY = ["Portfolio Intelligence"] as const

const ROADMAP_TOMORROW = [
  "Opportunity Discovery",
  "Meeting Preparation",
  "Client Intelligence",
  "Advisor Workflows",
] as const

export function LandingPage() {
  return (
    <MarketingLayout>
      <EchoHero />

      <DataSourcesSection />

      <MarketingSection id="advisors">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <SectionHeading
              eyebrow="Built for advisors"
              title="Advisors don't need more reports."
            />
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
              They need clarity.
            </p>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Echo brings portfolio intelligence, opportunity discovery, and client review
              preparation into one workspace.
            </p>
          </div>
          <div className="min-w-0">
            <PerformanceChartPreviewFrame aspectRatio="16 / 10" />
          </div>
        </div>
      </MarketingSection>

      <MarketingSection variant="muted" id="capabilities">
        <SectionHeading
          eyebrow="One system"
          title="One system for every review."
          align="center"
          className="mb-8 sm:mb-10"
        />
        <FeatureGrid items={FEATURES} />
      </MarketingSection>

      <MarketingSection id="focus">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <SectionHeading eyebrow="Focus" title="Focus on what matters." />
            <div className="space-y-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              <p>Your clients.</p>
              <p className="text-muted-foreground">Not spreadsheets.</p>
              <p className="text-muted-foreground">Not research tabs.</p>
              <p className="text-muted-foreground">Not presentation decks.</p>
            </div>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              Echo surfaces the information that requires action.
            </p>
          </div>
          <div className="min-w-0">
            <InsightsPreview aspectRatio="4 / 3" />
          </div>
        </div>
      </MarketingSection>

      <MarketingSection variant="muted" id="firms">
        <SectionHeading
          eyebrow="For modern firms"
          title="Designed for modern wealth firms."
          align="center"
          className="mb-8 sm:mb-10"
        />
        <ProductMosaic
          tiles={[
            {
              label: "Opportunities",
              content: <InsightsPreview showChrome={false} />,
            },
            {
              label: "Reviews",
              content: <KpiStripPreviewFrame showChrome={false} />,
            },
            {
              label: "Client insights",
              content: <PerformanceChartPreviewFrame showChrome={false} />,
            },
            {
              label: "Meeting preparation",
              content: <WorkspaceSlicePreviewFrame showChrome={false} />,
            },
          ]}
        />
      </MarketingSection>

      <MarketingSection id="workflow">
        <SectionHeading
          eyebrow="Workflow"
          title="From portfolio data to action."
          description="Upload a CAMS statement. Echo reconstructs the portfolio, identifies opportunities, prepares reviews, and highlights what deserves attention."
          align="center"
        />
        <StepFlow steps={WORKFLOW_STEPS} />
      </MarketingSection>

      <MarketingSection variant="muted" id="scale">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <SectionHeading
              eyebrow="Scale"
              title="Built to scale with your practice."
            />
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Whether you manage 50 clients or 5,000.
            </p>
            <p className="mt-4 text-lg text-muted-foreground">Echo grows with you.</p>
          </div>
          <div className="min-w-0">
            <ClientBookPreview />
          </div>
        </div>
      </MarketingSection>

      <MarketingSection id="roadmap">
        <SectionHeading
          eyebrow="Platform"
          title="The advisor operating system."
          align="center"
        />
        <div className="mx-auto max-w-2xl">
          <RoadmapColumns today={ROADMAP_TODAY} tomorrow={ROADMAP_TOMORROW} />
        </div>
      </MarketingSection>

      <MarketingSection variant="dark">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Spend less time preparing.
          </h2>
          <p className="mt-3 text-xl text-white/80 sm:text-2xl">
            Spend more time advising.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 min-h-12 bg-white px-8 text-black hover:bg-white/90"
          >
            <Link to="/demo">
              Book demo
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </MarketingSection>
    </MarketingLayout>
  )
}
