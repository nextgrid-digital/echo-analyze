import { apiFetch, readJson } from "@/api/client"
import type {
  BillingAccess,
  CreateSubscriptionResponse,
  VerifySubscriptionPaymentResponse,
} from "@/types/billing"

export async function getBillingAccess(): Promise<BillingAccess> {
  const response = await apiFetch("/api/billing/access", { method: "GET" })
  const payload = await readJson<BillingAccess & { detail?: unknown }>(response)
  if (!response.ok || !payload) {
    throw new Error(formatApiError(response, payload, "Unable to load billing access."))
  }
  return payload
}

export async function createSubscription(): Promise<CreateSubscriptionResponse> {
  const response = await apiFetch("/api/billing/create-subscription", { method: "POST" })
  const payload = await readJson<CreateSubscriptionResponse & { detail?: unknown }>(response)
  if (!response.ok || !payload) {
    throw new Error(formatApiError(response, payload, "Unable to start subscription."))
  }
  return payload
}

export async function verifySubscriptionPayment(payload: {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}): Promise<VerifySubscriptionPaymentResponse> {
  const response = await apiFetch("/api/billing/verify-subscription-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const result = await readJson<VerifySubscriptionPaymentResponse & { detail?: unknown }>(response)
  if (!response.ok || !result) {
    throw new Error(formatApiError(response, result, "Unable to verify subscription."))
  }
  return result
}

function formatApiError(
  response: Response,
  payload: { detail?: unknown } | null,
  fallback: string,
) {
  if (typeof payload?.detail === "string" && payload.detail.trim()) {
    return payload.detail
  }
  return response.status ? `${fallback} HTTP ${response.status}.` : fallback
}
