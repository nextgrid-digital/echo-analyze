export interface AdminSummaryMetrics {
  total_users: number
  admin_users: number
  active_users_30d: number
  total_sign_ins_30d: number
  total_analysis_runs: number
  successful_analysis_runs: number
  failed_analysis_runs: number
  average_duration_ms: number | null
  p50_duration_ms: number | null
  p95_duration_ms: number | null
}

export interface AdminRecentRun {
  id: string
  user_id: string
  status: "started" | "succeeded" | "failed"
  file_kind: "pdf" | "json" | "unknown" | null
  file_size_bytes: number | null
  had_password: boolean
  duration_ms: number | null
  error_code: string | null
  created_at: string
  completed_at: string | null
}

export interface AdminUserMetric {
  user_id: string
  role: "user" | "admin"
  created_at: string | null
  last_sign_in_at: string | null
  analysis_runs: number
  successful_runs: number
  failed_runs: number
  average_duration_ms: number | null
  last_run_at: string | null
}

export interface AdminUserEvent {
  id: string
  user_id: string
  event_type: "signed_up" | "signed_in"
  created_at: string
}

export interface AdminMetricsResponse {
  success: boolean
  summary: AdminSummaryMetrics
  recent_runs: AdminRecentRun[]
  user_metrics: AdminUserMetric[]
  recent_events: AdminUserEvent[]
}
