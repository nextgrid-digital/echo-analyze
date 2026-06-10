import { MarketingSection, SectionHeading } from "@/components/marketing/MarketingSection"

const DATA_SOURCES = [
  {
    name: "SEBI & AMFI",
    role: "Benchmark framework",
    description:
      "Tier 1 benchmark categories aligned with SEBI's two-tier framework and AMFI's published index lists.",
    href: "https://www.amfiindia.com",
  },
  {
    name: "NSE & BSE",
    role: "Equity indices",
    description:
      "Total Return Index (TRI) levels for Nifty, Sensex, and sector indices used in performance comparison.",
    href: "https://www.nseindia.com",
  },
  {
    name: "AMFI",
    role: "Fund & NAV data",
    description:
      "Official scheme master, NAVAll pricing, and sectoral benchmark mappings for mutual fund holdings.",
    href: "https://portal.amfiindia.com",
  },
  {
    name: "CAMS",
    role: "Portfolio statements",
    description:
      "Consolidated Account Statements (CAS) for importing client holdings into Echo.",
    href: "https://www.camsonline.com",
  },
  {
    name: "CRISIL",
    role: "Debt benchmarks",
    description:
      "Published debt, liquid, and hybrid indices used for fixed-income and balanced fund benchmarks.",
    href: "https://www.crisil.com",
  },
] as const

export function DataSourcesSection() {
  return (
    <MarketingSection variant="muted" id="data-sources">
      <SectionHeading
        eyebrow="Data sources"
        title="Benchmarks anchored to official India market data."
        description="Echo maps every holding to the right benchmark using regulatory frameworks and published market datasets—not generic one-size-fits-all proxies."
        align="center"
        className="mb-8 sm:mb-10"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DATA_SOURCES.map((source) => (
          <article
            key={source.name}
            className="rounded-xl border border-border bg-background p-5 transition-colors hover:bg-muted/20 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight">{source.name}</h3>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {source.role}
                </p>
              </div>
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Source
              </a>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{source.description}</p>
          </article>
        ))}
      </div>
    </MarketingSection>
  )
}
