export interface BillingAccess {
  can_analyze: boolean
  has_unlimited_reports: boolean
  cas_report_limit: number
  cas_reports_used: number
  remaining_free_reports: number
  subscription_status: string
  razorpay_subscription_id?: string | null
  current_period_end?: string | null
}

export interface CreateSubscriptionResponse {
  key_id: string
  subscription_id: string
  subscription_status: string
  access: BillingAccess
}

export interface VerifySubscriptionPaymentResponse {
  success: boolean
  access: BillingAccess
}
