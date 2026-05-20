import { useState } from "react"
import { useAuth, useUser } from "@clerk/react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Loader2 } from "lucide-react"
import {
  createOrder,
  createSubscription,
  verifyPayment,
  type PaymentsConfig,
} from "@/api/payments"
import {
  openRazorpayCheckout,
  type RazorpayCheckoutSuccess,
} from "@/lib/razorpay"

type CheckoutMode = "order" | "subscription"

interface RazorpayCheckoutButtonProps {
  config: PaymentsConfig
  mode: CheckoutMode
  amountPaise?: number
  label?: string
  description?: string
  receipt?: string
  totalCount?: number
  onSuccess?: (kind: "order" | "subscription") => void
}

function formatAmount(amountPaise: number | null | undefined, currency: string): string {
  if (!amountPaise || amountPaise <= 0) return ""
  const rupees = amountPaise / 100
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(rupees)
  } catch {
    return `${currency} ${rupees.toFixed(2)}`
  }
}

export function RazorpayCheckoutButton({
  config,
  mode,
  amountPaise,
  label,
  description,
  receipt,
  totalCount,
  onSuccess,
}: RazorpayCheckoutButtonProps) {
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const resolvedAmount =
    mode === "order"
      ? amountPaise ?? config.default_amount_paise ?? 0
      : config.default_amount_paise ?? 0
  const formattedAmount = formatAmount(resolvedAmount, config.currency || "INR")
  const fallbackLabel =
    mode === "subscription"
      ? formattedAmount
        ? `Subscribe ${formattedAmount} / month`
        : "Subscribe monthly"
      : formattedAmount
        ? `Pay ${formattedAmount}`
        : "Pay now"

  const disabledReason = !config.enabled
    ? "Payments are not configured for this environment."
    : !isSignedIn
      ? "Please sign in to continue."
      : mode === "order" && resolvedAmount < 100
        ? "Amount must be at least \u20b91."
        : mode === "subscription" && !config.plan_id
          ? "No subscription plan is configured."
          : null

  const handleClick = async () => {
    if (disabledReason) {
      setError(disabledReason)
      return
    }
    setError(null)
    setSuccess(null)
    setBusy(true)

    try {
      const tokenGetter = () => getToken()
      let orderId: string | undefined
      let subscriptionId: string | undefined
      let publicKeyId: string

      if (mode === "order") {
        const order = await createOrder(
          {
            amount_paise: resolvedAmount,
            currency: config.currency,
            receipt,
          },
          tokenGetter
        )
        orderId = order.order_id
        publicKeyId = order.key_id
      } else {
        const subscription = await createSubscription(
          {
            total_count: totalCount,
            customer_notify: true,
          },
          tokenGetter
        )
        subscriptionId = subscription.subscription_id
        publicKeyId = subscription.key_id
      }

      if (!publicKeyId) {
        throw new Error("Razorpay public key is not available.")
      }

      const prefill = {
        name: user?.fullName ?? undefined,
        email: user?.primaryEmailAddress?.emailAddress ?? undefined,
        contact: user?.primaryPhoneNumber?.phoneNumber ?? undefined,
      }

      await openRazorpayCheckout({
        key: publicKeyId,
        name: "Echo Analyze",
        description:
          description ??
          (mode === "subscription"
            ? config.description ?? "Monthly subscription"
            : "Echo Analyze payment"),
        orderId,
        subscriptionId,
        amount: mode === "order" ? resolvedAmount : undefined,
        currency: config.currency,
        prefill,
        onSuccess: async (result: RazorpayCheckoutSuccess) => {
          try {
            await verifyPayment(
              {
                razorpay_payment_id: result.razorpay_payment_id,
                razorpay_signature: result.razorpay_signature,
                razorpay_order_id: result.razorpay_order_id,
                razorpay_subscription_id: result.razorpay_subscription_id,
              },
              tokenGetter
            )
            setSuccess(
              mode === "subscription"
                ? "Subscription activated. You will be billed monthly."
                : "Payment received. Thank you!"
            )
            onSuccess?.(mode)
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not verify payment.")
          } finally {
            setBusy(false)
          }
        },
        onDismiss: () => {
          setBusy(false)
        },
        onFailure: (err) => {
          setError(err.description ?? "Payment failed. Please try again.")
          setBusy(false)
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.")
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={handleClick}
        disabled={busy || Boolean(disabledReason)}
        className="w-full sm:w-auto"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <CreditCard className="size-4" aria-hidden />
        )}
        {label ?? fallbackLabel}
      </Button>
      {disabledReason ? (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
