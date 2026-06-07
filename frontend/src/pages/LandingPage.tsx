import { Link } from "react-router-dom"
import { DashboardPreview } from "@/components/marketing/DashboardPreview"
import { MarketingSection, SectionHeading } from "@/components/marketing/MarketingSection"
import { StepFlow } from "@/components/marketing/StepFlow"
import { MarketingLayout } from "@/components/MarketingLayout"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BarChart3,
  FileSearch,
  Layers,
  PieChart,
  Shield,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react"

const FEATURES = [
  {
    icon: BarChart3,
    title: "Performance & XIRR",
    description:
      "Track returns across 1Y, 3Y, and 5Y horizons with benchmark comparisons and underperformance flags.",
    accent: "border-l-emerald-500",
    iconBg: "bg-emerald-500 text-white",
  },
  {
    icon: PieChart,
    title: "Asset allocation",
    description:
      "See equity, debt, and hybrid splits with gap analysis against your target allocation guidelines.",
    accent: "border-l-sky-500",
    iconBg: "bg-sky-500 text-white",
  },
  {
    icon: Layers,
    title: "Fund overlap",
    description:
      "Identify concentration risk when multiple funds hold the same underlying stocks.",
    accent: "border-l-violet-500",
    iconBg: "bg-violet-500 text-white",
  },
  {
    icon: Shield,
    title: "Risk metrics",
    description:
      "Review volatility, drawdowns, and portfolio health indicators in one executive summary.",
    accent: "border-l-amber-500",
    iconBg: "bg-amber-500 text-white",
  },
  {
    icon: FileSearch,
    title: "Tax & cost analysis",
    description:
      "Understand expense ratios, tax implications, and cost drag across your holdings.",
    accent: "border-l-rose-500",
    iconBg: "bg-rose-500 text-white",
  },
  {
    icon: Upload,
    title: "CAS-native workflow",
    description:
      "Upload a CAS PDF or JSON file — no manual data entry. Password-protected PDFs supported.",
    accent: "border-l-cyan-500",
    iconBg: "bg-cyan-500 text-white",
  },
] as const

const STEPS = [
  {
    step: "01",
    title: "Download your CAS",
    description: "Get your Consolidated Account Statement from CAMS, KFintech, or your fund house.",
  },
  {
    step: "02",
    title: "Upload to ECHO",
    description: "Drop your CAS PDF or JSON file. Enter your PDF password if required.",
  },
  {
    step: "03",
    title: "Review your dashboard",
    description: "Get a full portfolio breakdown with charts, tables, and export tools.",
  },
] as const

const HIGHLIGHTS = [
  { icon: Zap, label: "Instant analysis", value: "< 30 sec", color: "text-amber-500" },
  { icon: Sparkles, label: "Analytics modules", value: "12+", color: "text-violet-500" },
  { icon: Upload, label: "Free to start", value: "1 report", color: "text-emerald-500" },
] as const

const PREVIEW_BULLETS = [
  { text: "Portfolio vs benchmark performance charts", color: "bg-emerald-500" },
  { text: "Equity, debt, and hybrid allocation breakdowns", color: "bg-sky-500" },
  { text: "Export-ready reports for client reviews", color: "bg-violet-500" },
] as const

export function LandingPage() {
  return (
    <MarketingLayout>
      <section className="marketing-hero relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
        <div className="marketing-grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Mutual fund portfolio analyzer
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Your CAS,
              <span className="marketing-text-gradient block">fully analyzed</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              ECHO transforms a single Consolidated Account Statement into a rich
              analytics dashboard — allocation, performance, overlap, risk, and more.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="min-h-12 px-8">
                <Link to="/upload">
                  Start analyzing
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-12 px-8">
                <Link to="/pricing">View pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              One free CAS report included. No credit card required.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3 border-t border-emerald-100 pt-8 sm:gap-6">
              {HIGHLIGHTS.map(({ icon: Icon, label, value, color }) => (
                <div key={label}>
                  <Icon className={`mb-2 h-4 w-4 ${color}`} />
                  <p className="font-mono text-lg font-semibold sm:text-xl">{value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:pl-4">
            <div className="marketing-glow absolute -inset-4 rounded-none opacity-60" />
            <DashboardPreview />
          </div>
        </div>
      </section>

      <MarketingSection variant="muted" id="features">
        <SectionHeading
          eyebrow="Capabilities"
          title="Everything in your CAS, analyzed"
          description="Built for investors and advisors who want clarity without spreadsheets."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {FEATURES.map(({ icon: Icon, title, description, accent, iconBg }) => (
            <div
              key={title}
              className={`group border border-border border-l-4 bg-background p-6 transition-all hover:shadow-apple ${accent}`}
            >
              <div className={`mb-4 flex h-10 w-10 items-center justify-center ${iconBg}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection id="preview">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Dashboard preview"
              title="See the full picture at a glance"
              description="From executive summary to holdings tables — every section is designed for quick decisions."
            />
            <ul className="space-y-3 text-sm text-muted-foreground">
              {PREVIEW_BULLETS.map(({ text, color }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${color}`} />
                  {text}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8" variant="outline">
              <Link to="/upload">
                Try with your CAS
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <DashboardPreview />
        </div>
      </MarketingSection>

      <MarketingSection variant="muted" id="how-it-works">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps from CAS to insights"
          description="No manual data entry. Upload your statement and get a complete dashboard."
          align="center"
        />
        <StepFlow steps={STEPS} />
      </MarketingSection>

      <MarketingSection variant="dark">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            title="Ready to analyze your portfolio?"
            description="Upload your first CAS report free, or subscribe for unlimited analysis."
            align="center"
            dark
          />
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="min-h-12 bg-background px-8 text-foreground hover:bg-background/90"
            >
              <Link to="/upload">
                Get started
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-12 border-background/30 bg-transparent px-8 text-background hover:bg-background/10"
            >
              <Link to="/pricing">See plans</Link>
            </Button>
          </div>
        </div>
      </MarketingSection>
    </MarketingLayout>
  )
}
