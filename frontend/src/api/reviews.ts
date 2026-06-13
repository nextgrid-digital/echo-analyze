import { apiFetch, readJson } from "@/api/client"
import type {
  ClientReviewPayload,
  PrepareReviewResponse,
  ReviewCompareResponse,
  ReviewHistoryEvent,
  ReviewLinkRow,
  ShareReviewResponse,
} from "@/types/review"
import type { AnalysisResponse } from "@/types/api"

export async function prepareReview(clientPan: string, notes = ""): Promise<PrepareReviewResponse> {
  const response = await apiFetch("/api/reviews/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_pan: clientPan, notes }),
  })
  const payload = await readJson<PrepareReviewResponse>(response)
  if (!response.ok || !payload) {
    throw new Error((payload as { detail?: string } | null)?.detail ?? "Could not prepare review.")
  }
  return payload
}

export async function shareReview(clientPan: string): Promise<ShareReviewResponse> {
  const response = await apiFetch("/api/reviews/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_pan: clientPan }),
  })
  const payload = await readJson<ShareReviewResponse>(response)
  if (!response.ok || !payload) {
    throw new Error((payload as { detail?: string } | null)?.detail ?? "Could not share review.")
  }
  return payload
}

export async function createCasUploadSnapshot(
  clientPan: string,
  analysis: AnalysisResponse,
): Promise<void> {
  const response = await apiFetch("/api/reviews/snapshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_pan: clientPan, analysis }),
  })
  if (!response.ok) {
    return
  }
}

export async function fetchPublicReview(shareId: string): Promise<ClientReviewPayload> {
  const response = await fetch(`/api/reviews/public/${encodeURIComponent(shareId)}`)
  const payload = await readJson<ClientReviewPayload>(response)
  if (!response.ok || !payload) {
    const detail = (payload as { detail?: string } | null)?.detail ?? "Review not available."
    throw new Error(detail)
  }
  return payload
}

export async function disableReviewLink(linkId: string): Promise<void> {
  const response = await apiFetch(`/api/reviews/links/${encodeURIComponent(linkId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: false }),
  })
  if (!response.ok) {
    throw new Error("Could not disable review link.")
  }
}

export async function fetchReviewHistory(clientPan: string): Promise<{
  events: ReviewHistoryEvent[]
  links: ReviewLinkRow[]
}> {
  const response = await apiFetch(`/api/reviews/history/${encodeURIComponent(clientPan)}`)
  const payload = await readJson<{ events: ReviewHistoryEvent[]; links: ReviewLinkRow[] }>(response)
  if (!response.ok || !payload) {
    throw new Error("Could not load review history.")
  }
  return payload
}

export async function compareReviewSnapshots(
  leftSnapshotId: string,
  rightSnapshotId: string,
): Promise<ReviewCompareResponse> {
  const params = new URLSearchParams({
    left_snapshot_id: leftSnapshotId,
    right_snapshot_id: rightSnapshotId,
  })
  const response = await apiFetch(`/api/reviews/compare?${params.toString()}`)
  const payload = await readJson<ReviewCompareResponse>(response)
  if (!response.ok || !payload) {
    throw new Error("Could not compare reviews.")
  }
  return payload
}

export function buildReviewUrl(shareId: string): string {
  if (typeof window === "undefined") {
    return `/review/${shareId}`
  }
  return `${window.location.origin}/review/${shareId}`
}
