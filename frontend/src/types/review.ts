export type PortfolioHealthStatus = "excellent" | "good" | "needs_attention"

export interface ClientReviewOverview {
  current_value: number
  invested_value: number
  gain_loss: number
  portfolio_return: number
  portfolio_xirr: number | null
  benchmark_xirr: number | null
  benchmark_label: string
}

export interface WealthJourneyPoint {
  date: string
  invested?: number
  portfolio_value?: number
  event_type: string
  amount?: number
}

export interface WealthJourneyMilestone {
  label: string
  date?: string
  value?: number
}

export interface ClientReviewPayload {
  client_name: string
  advisor_name: string
  statement_date?: string | null
  generated_at: string
  overview: ClientReviewOverview
  health_status: PortfolioHealthStatus
  wealth_journey: {
    mode: "transactions" | "limited"
    points: WealthJourneyPoint[]
    milestones: WealthJourneyMilestone[]
  }
  asset_allocation: Array<{ category: string; allocation_pct: number }>
  whats_working_well: string[]
  areas_to_discuss: string[]
  next_review_date: string
}

export interface MeetingBrief {
  client_summary: string
  key_strengths: string[]
  key_concerns: string[]
  discussion_topics: string[]
  questions_to_ask: string[]
  follow_up_actions: string[]
  whatsapp_draft: string
  email_draft: string
}

export interface PrepareReviewResponse {
  snapshot_id: string
  brief: MeetingBrief
  event_id: string | null
  next_review_date: string
}

export interface ShareReviewResponse {
  share_id: string
  link_id: string
  expires_at: string
  review_url_path: string
  event_id: string | null
}

export interface ReviewHistoryEvent {
  id: string
  review_date: string
  notes: string
  next_review_date: string | null
  snapshot_id: string
  meeting_brief_id: string | null
  review_link_id: string | null
}

export interface ReviewLinkRow {
  id: string
  share_id: string
  created_at: string
  expires_at: string
  is_active: boolean
  snapshot_id: string
}

export interface ReviewCompareResponse {
  left_snapshot_id: string
  right_snapshot_id: string
  left_created_at: string
  right_created_at: string
  deltas: {
    current_value: number | null
    invested_value: number | null
    gain_loss: number | null
    portfolio_xirr: number | null
    benchmark_xirr: number | null
  }
  left_health_status: PortfolioHealthStatus
  right_health_status: PortfolioHealthStatus
}

export type OpportunityType =
  | "sip_increase"
  | "portfolio_consolidation"
  | "amc_concentration"
  | "underperforming_holdings"
  | "equity_allocation"
  | "debt_allocation"
  | "idle_cash"
  | "tax_planning"

export type OpportunityPriority = "high" | "medium" | "low"

export interface Opportunity {
  clientPan: string
  clientName: string
  type: OpportunityType
  potentialAmount: number
  priority: OpportunityPriority
  reason: string
  suggestedAction: string
}
