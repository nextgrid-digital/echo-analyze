import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { fetchPublicReview } from "@/api/reviews"
import { EchoLogo } from "@/components/EchoLogo"
import {
  ReviewAllocation,
  ReviewFooter,
  ReviewHealthBadge,
  ReviewHero,
  ReviewNarrative,
  ReviewWealthJourney,
} from "@/features/client-review/components/ClientReviewSections"
import { ThemeProvider } from "@/components/themes/theme-provider"
import type { ClientReviewPayload } from "@/types/review"

export function ClientReviewPage() {
  const { shareId } = useParams<{ shareId: string }>()
  const [payload, setPayload] = useState<ClientReviewPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shareId) {
      setError("Invalid review link.")
      setLoading(false)
      return
    }

    let cancelled = false
    fetchPublicReview(shareId)
      .then((data) => {
        if (!cancelled) setPayload(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Review not available.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [shareId])

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <EchoLogo className="h-7" />
            <span className="text-xs text-muted-foreground">Client Review</span>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading your portfolio review…</p>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
              <h1 className="text-lg font-semibold">Review unavailable</h1>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : null}
          {payload ? (
            <>
              <ReviewHero payload={payload} />
              <ReviewHealthBadge status={payload.health_status} />
              <ReviewWealthJourney payload={payload} />
              <ReviewAllocation payload={payload} />
              <ReviewNarrative payload={payload} />
              <ReviewFooter payload={payload} />
            </>
          ) : null}
        </main>
      </div>
    </ThemeProvider>
  )
}
