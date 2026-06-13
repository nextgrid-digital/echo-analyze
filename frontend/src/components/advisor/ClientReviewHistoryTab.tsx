import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { compareReviewSnapshots, fetchReviewHistory } from "@/api/reviews"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ReviewCompareResponse, ReviewHistoryEvent } from "@/types/review"

interface ClientReviewHistoryTabProps {
  clientPan?: string
}

export function ClientReviewHistoryTab({ clientPan }: ClientReviewHistoryTabProps) {
  const [events, setEvents] = useState<ReviewHistoryEvent[]>([])
  const [links, setLinks] = useState<Array<{ id: string; share_id: string; is_active: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [compareLeft, setCompareLeft] = useState<string>("")
  const [compareRight, setCompareRight] = useState<string>("")
  const [compareResult, setCompareResult] = useState<ReviewCompareResponse | null>(null)

  useEffect(() => {
    if (!clientPan) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetchReviewHistory(clientPan)
      .then((data) => {
        if (!cancelled) {
          setEvents(data.events)
          setLinks(data.links)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([])
          setLinks([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientPan])

  const linkById = useMemo(() => new Map(links.map((link) => [link.id, link])), [links])

  const handleCompare = async () => {
    if (!compareLeft || !compareRight || compareLeft === compareRight) return
    const result = await compareReviewSnapshots(compareLeft, compareRight)
    setCompareResult(result)
  }

  if (!clientPan) {
    return <p className="text-sm text-muted-foreground">Select a client to view review history.</p>
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading review history…</p>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review Timeline</CardTitle>
          <CardDescription>Past reviews, meeting briefs, and shared links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet. Prepare or share a review to start history.</p>
          ) : (
            events.map((event) => {
              const link = event.review_link_id ? linkById.get(event.review_link_id) : undefined
              return (
                <div key={event.id} className="rounded-lg border px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {new Date(event.review_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {event.next_review_date ? (
                      <span className="text-muted-foreground">Next: {event.next_review_date}</span>
                    ) : null}
                  </div>
                  {event.notes ? <p className="mt-2 text-muted-foreground">{event.notes}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {event.meeting_brief_id ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Meeting brief saved</span>
                    ) : null}
                    {link ? (
                      <Link
                        to={`/review/${link.share_id}`}
                        className="text-xs font-medium text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.is_active ? "Open shared review" : "Shared link (disabled)"}
                      </Link>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {events.length >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compare Reviews</CardTitle>
            <CardDescription>See how portfolio metrics changed between two review snapshots.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={compareLeft} onValueChange={setCompareLeft}>
                <SelectTrigger>
                  <SelectValue placeholder="Earlier snapshot" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.snapshot_id} value={event.snapshot_id}>
                      {new Date(event.review_date).toLocaleDateString("en-IN")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={compareRight} onValueChange={setCompareRight}>
                <SelectTrigger>
                  <SelectValue placeholder="Later snapshot" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={`${event.id}-right`} value={event.snapshot_id}>
                      {new Date(event.review_date).toLocaleDateString("en-IN")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCompare} disabled={!compareLeft || !compareRight || compareLeft === compareRight}>
              Compare
            </Button>
            {compareResult ? (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-md border p-3">Value Δ: {compareResult.deltas.current_value ?? "—"}</div>
                <div className="rounded-md border p-3">XIRR Δ: {compareResult.deltas.portfolio_xirr ?? "—"}</div>
                <div className="rounded-md border p-3">Health: {compareResult.left_health_status} → {compareResult.right_health_status}</div>
                <div className="rounded-md border p-3">Gain/Loss Δ: {compareResult.deltas.gain_loss ?? "—"}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
