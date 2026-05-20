import { apiFetch, readJson, type TokenGetter } from "@/api/client"

export interface PaymentsConfig {
  enabled: boolean
  key_id: string | null
  currency: string
  default_amount_paise: number | null
  plan_id: string | null
  period: string
  interval: number
  description: string | null
}

export interface CreateOrderResponse {
  order_id: string
  amount: number
  currency: string
  receipt?: string | null
  status?: string | null
  key_id: string
}

export interface CreateSubscriptionResponse {
  subscription_id: string
  plan_id?: string | null
  status?: string | null
  short_url?: string | null
  current_start?: number | null
  current_end?: number | null
  total_count?: number | null
  paid_count?: number | null
  remaining_count?: number | null
  key_id: string
}

export interface VerifyPaymentRequest {
  razorpay_payment_id: string
  razorpay_signature: string
  razorpay_order_id?: string
  razorpay_subscription_id?: string
}

export interface VerifyPaymentResponse {
  verified: boolean
  kind: "order" | "subscription"
}

async function parseError(response: Response): Promise<string> {
  const data = await readJson<{ detail?: string; error?: string }>(response)
  if (data?.detail) return data.detail
  if (data?.error) return data.error
  return `Request failed (HTTP ${response.status})`
}

export async function fetchPaymentsConfig(): Promise<PaymentsConfig> {
  const response = await apiFetch("/api/payments/config", { method: "GET" })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  const data = await readJson<PaymentsConfig>(response)
  if (!data) {
    throw new Error("Invalid payments config response.")
  }
  return data
}

export async function createOrder(
  input: {
    amount_paise: number
    currency?: string
    receipt?: string
    notes?: Record<string, string>
  },
  getToken: TokenGetter
): Promise<CreateOrderResponse> {
  const response = await apiFetch(
    "/api/payments/create-order",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    getToken
  )
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  const data = await readJson<CreateOrderResponse>(response)
  if (!data) {
    throw new Error("Invalid create-order response.")
  }
  return data
}

export async function createSubscription(
  input: {
    plan_id?: string
    total_count?: number
    customer_notify?: boolean
    notes?: Record<string, string>
  },
  getToken: TokenGetter
): Promise<CreateSubscriptionResponse> {
  const response = await apiFetch(
    "/api/payments/create-subscription",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    getToken
  )
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  const data = await readJson<CreateSubscriptionResponse>(response)
  if (!data) {
    throw new Error("Invalid create-subscription response.")
  }
  return data
}

export async function verifyPayment(
  input: VerifyPaymentRequest,
  getToken: TokenGetter
): Promise<VerifyPaymentResponse> {
  const response = await apiFetch(
    "/api/payments/verify-payment",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    getToken
  )
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  const data = await readJson<VerifyPaymentResponse>(response)
  if (!data) {
    throw new Error("Invalid verify-payment response.")
  }
  return data
}
