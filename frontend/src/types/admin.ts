export type AdminLogWindow = "24h" | "7d" | "30d"

export interface AdminAnalyticsMetrics {
  registered_users?: number | null
  total_users?: number | null
  tracked_users: number
  active_users: number
  active_users_7d: number
  total_analyses: number
  successful_analyses: number
  failed_analyses: number
  success_rate: number
  average_duration_ms: number
  fastest_duration_ms?: number | null
  slowest_duration_ms?: number | null
  last_analysis_at?: string | null
}

export interface AdminAnalysisRun {
  request_id: string
  username: string
  file_type?: string | null
  status: string
  duration_ms?: number | null
  holdings_count?: number | null
  total_market_value?: number | null
  error_message?: string | null
  created_at: string
}

export interface AdminLogEntry {
  username?: string | null
  route: string
  action: string
  status: string
  message: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface AdminTopUser {
  username: string
  report_count: number
  last_analysis_at?: string | null
}

export interface AdminOverviewResponse {
  metrics: AdminAnalyticsMetrics
  log_window: AdminLogWindow
  recent_analyses: AdminAnalysisRun[]
  recent_logs: AdminLogEntry[]
  top_users: AdminTopUser[]
}
