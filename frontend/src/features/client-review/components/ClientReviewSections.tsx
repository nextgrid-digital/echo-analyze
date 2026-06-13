import { Link } from "react-router-dom"
import { ArrowUpRight, Calendar, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPercent } from "@/lib/format"
import type { ClientReviewPayload, PortfolioHealthStatus } from "@/types/review"
import { cn } from "@/lib/utils"

function formatInr(value: number) {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`
  return `₹${value.toLocaleString("en-IN")}`
}

const HEALTH_STYLES: Record<
  PortfolioHealthStatus,
  { label: string; className: string }
> = {
  excellent: { label: "Excellent", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  good: { label: "Good", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  needs_attention: { label: "Needs Attention", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
}

export function ReviewHero({ payload }: { payload: ClientReviewPayload }) {
  const overview = payload.overview
  const items = [
    { label: "Current Value", value: formatInr(overview.current_value) },
    { label: "Invested", value: formatInr(overview.invested_value) },
    {
      label: "Gain / Loss",
      value: formatInr(overview.gain_loss),
      tone: overview.gain_loss >= 0 ? "positive" : "negative",
    },
    {
      label: "XIRR",
      value: overview.portfolio_xirr != null ? formatPercent(overview.portfolio_xirr) : "—",
    },
    {
      label: overview.benchmark_label,
      value: overview.benchmark_xirr != null ? formatPercent(overview.benchmark_xirr) : "—",
    },
  ]

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Portfolio Review</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{payload.client_name}</h1>
        <p className="text-sm text-muted-foreground">
          Prepared by {payload.advisor_name}
          {payload.statement_date ? ` · Statement ${payload.statement_date}` : ""}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <Card key={item.label} className="border-border/60 bg-card/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p
                className={cn(
                  "mt-1 text-xl font-semibold",
                  item.tone === "positive" && "text-emerald-600 dark:text-emerald-400",
                  item.tone === "negative" && "text-rose-600 dark:text-rose-400",
                )}
              >
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

export function ReviewHealthBadge({ status }: { status: PortfolioHealthStatus }) {
  const style = HEALTH_STYLES[status]
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Portfolio Health</CardTitle>
        <CardDescription>Overall portfolio status based on allocation and performance signals.</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge className={cn("px-3 py-1 text-sm font-medium", style.className)}>{style.label}</Badge>
      </CardContent>
    </Card>
  )
}

export function ReviewWealthJourney({ payload }: { payload: ClientReviewPayload }) {
  const { wealth_journey: journey } = payload
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Wealth Journey</CardTitle>
        <CardDescription>
          {journey.mode === "limited"
            ? "Illustrative journey based on available holding data."
            : "Investment activity and portfolio growth over time."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {journey.milestones.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {journey.milestones.map((milestone) => (
              <Badge key={milestone.label} variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {milestone.label}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="space-y-2">
          {journey.points.slice(-8).map((point) => (
            <div
              key={`${point.date}-${point.event_type}`}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{point.date}</span>
              <span className="font-medium capitalize">{point.event_type.replace("_", " ")}</span>
              <span>
                {point.portfolio_value != null
                  ? formatInr(point.portfolio_value)
                  : point.invested != null
                    ? formatInr(point.invested)
                    : point.amount != null
                      ? formatInr(point.amount)
                      : "—"}
              </span>
            </div>
          ))}
          {journey.points.length === 0 ? (
            <p className="text-sm text-muted-foreground">Timeline data will appear after more investment history is available.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function ReviewAllocation({ payload }: { payload: ClientReviewPayload }) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {payload.asset_allocation.map((item) => (
          <div key={item.category} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{item.category}</span>
              <span className="font-medium">{formatPercent(item.allocation_pct)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.min(item.allocation_pct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ReviewNarrative({ payload }: { payload: ClientReviewPayload }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">What&apos;s Working Well</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {payload.whats_working_well.map((item) => (
              <li key={item} className="rounded-lg border px-3 py-2">{item}</li>
            ))}
            {payload.whats_working_well.length === 0 ? (
              <li className="text-muted-foreground">Your advisor will highlight strengths during the review.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Areas To Discuss</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {payload.areas_to_discuss.map((item) => (
              <li key={item} className="rounded-lg border px-3 py-2">{item}</li>
            ))}
            {payload.areas_to_discuss.length === 0 ? (
              <li className="text-muted-foreground">Discussion topics will be shared in your review meeting.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export function ReviewFooter({ payload }: { payload: ClientReviewPayload }) {
  return (
    <footer className="rounded-2xl border border-border/60 bg-muted/30 px-6 py-5 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Next review: {payload.next_review_date}</span>
        </div>
        <Link to="/" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Powered by Echo
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        This review is for discussion purposes only and does not constitute investment advice.
      </p>
    </footer>
  )
}
