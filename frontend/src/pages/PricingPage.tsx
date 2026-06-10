import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { withAuthRedirect } from "@/lib/authRedirect"
import { createSubscription, verifySubscriptionPayment } from "@/api/billing"
import { useAuth } from "@/auth/useAuth"
import { PricingFaq } from "@/components/marketing/PricingFaq"
import { MarketingLayout } from "@/components/MarketingLayout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { loadRazorpayCheckout } from "@/lib/razorpayCheckout"
import { cn } from "@/lib/utils"
import { Check, CreditCard, Infinity as InfinityIcon, ScanLine, Sparkles } from "lucide-react"

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout
  }
}

interface RazorpayCheckout {
  open: () => void
  on?: (event: "payment.failed", handler: (response: RazorpayPaymentFailedResponse) => void) => void
}

interface RazorpayOptions {
  key: string
  subscription_id: string
  name: string
  description: string
  theme: { color: string }
  prefill?: { email?: string }
  handler: (response: RazorpayCheckoutResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayCheckoutResponse {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

interface RazorpayPaymentFailedResponse {
  error?: {
    code?: string
    description?: string
    reason?: string
  }
}

const COMPARISON_ROWS = [
  { feature: "Advisor workspace", free: true, unlimited: true },
  { feature: "Portfolio intelligence", free: true, unlimited: true },
  { feature: "Client review exports", free: true, unlimited: true },
  { feature: "Client portfolios", free: "1", unlimited: "Unlimited" },
  { feature: "Monthly billing", free: false, unlimited: true },
] as const

export function PricingPage() {
  const navigate = useNavigate()
  const { user, billingAccess, refreshBillingAccess } = useAuth()
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isUnlimited = billingAccess?.has_unlimited_reports === true
  const remainingReports = billingAccess?.remaining_free_reports ?? 0
  const canStartSubscription = Boolean(user && billingAccess && !isUnlimited)

  const handleSubscribe = async () => {
    if (!user) {
      navigate(withAuthRedirect("/sign-in", "/pricing"))
      return
    }

    setError(null)
    setSuccess(null)

    if (!billingAccess) {
      setError("Checking your report access. Please try again in a moment.")
      return
    }
    if (isUnlimited) {
      setSuccess("Subscription active. Unlimited CAS analysis is already unlocked.")
      return
    }

    setIsSubscribing(true)

    try {
      await loadRazorpayCheckout()
      const subscription = await createSubscription()

      await new Promise<void>((resolve, reject) => {
        const Razorpay = window.Razorpay
        if (!Razorpay) {
          reject(new Error("Checkout did not load. Please try again."))
          return
        }

        const checkout = new Razorpay({
          key: subscription.key_id,
          subscription_id: subscription.subscription_id,
          name: "ECHO",
          description: "Unlimited client portfolio analysis",
          theme: { color: "#000000" },
          prefill: { email: user?.email },
          handler: (response) => {
            verifySubscriptionPayment(response)
              .then(async () => {
                await refreshBillingAccess()
                setSuccess("Subscription active. Unlimited CAS analysis is unlocked.")
                resolve()
              })
              .catch(reject)
          },
          modal: {
            ondismiss: () => resolve(),
          },
        })
        checkout.on?.("payment.failed", (response) => {
          reject(new Error(formatRazorpayCheckoutFailure(response)))
        })
        checkout.open()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed. Please try again.")
    } finally {
      setIsSubscribing(false)
    }
  }

  return (
    <MarketingLayout>
      <section className="marketing-hero relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16">
        <div className="marketing-grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Simple, transparent pricing
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Plans for advisory practices
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Start with one client portfolio, then scale to unlimited reviews across your
            book.
          </p>
        </div>
      </section>

      <div className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto w-full max-w-6xl">
          {(error || success) && (
            <Alert variant={error ? "destructive" : "default"} className="mb-8">
              <AlertDescription>{error ?? success}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
            <Card className="relative flex h-full min-h-[460px] flex-col border-t-[3px] border-t-sky-500 bg-sky-50/40 shadow-apple">
              <CardHeader>
                <div className="mb-3 flex h-11 w-11 items-center justify-center bg-sky-500 text-white">
                  <ScanLine className="h-5 w-5" />
                </div>
                <CardTitle className="text-2xl">Free</CardTitle>
                <CardDescription>For evaluating Echo with one client portfolio.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-8">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-semibold tracking-tight">Rs 0</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {user
                      ? remainingReports > 0
                        ? `${remainingReports} free report remaining`
                        : "Free report already used"
                      : "One free report included"}
                  </p>
                  <div className="mt-8 space-y-4 text-sm">
                    <Feature>One client portfolio</Feature>
                    <Feature>Full advisor workspace and exports</Feature>
                    <Feature>No commitment required</Feature>
                  </div>
                </div>
                <Button asChild variant="outline" className="min-h-11 w-full">
                  <Link to="/upload">Use free report</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative flex h-full min-h-[460px] flex-col border-t-[3px] border-t-violet-500 bg-violet-50/30 shadow-apple-hover">
              <Badge className="absolute -top-3 right-6 bg-primary text-primary-foreground">
                Most popular
              </Badge>
              <CardHeader>
                <div className="mb-3 flex h-11 w-11 items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                  <InfinityIcon className="h-5 w-5" />
                </div>
                <CardTitle className="text-2xl">Unlimited</CardTitle>
                <CardDescription>For practices running reviews across many clients.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-8">
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-semibold tracking-tight">Rs 2,360</span>
                    <span className="pb-1.5 text-sm text-muted-foreground">/ month</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Rs 2,000 plus 18% GST, billed monthly via Razorpay.
                  </p>
                  <div className="mt-8 space-y-4 text-sm">
                    <Feature highlight>Unlimited client portfolios</Feature>
                    <Feature highlight>Full workspace on every review</Feature>
                    <Feature highlight>Easy renewal and cancellation</Feature>
                  </div>
                </div>
                <Button
                  type="button"
                  className="min-h-11 w-full"
                  disabled={isSubscribing || isUnlimited || (Boolean(user) && !canStartSubscription)}
                  onClick={() => void handleSubscribe()}
                >
                  <CreditCard className="h-4 w-4" />
                  {isUnlimited
                    ? "Active"
                    : !billingAccess && user
                      ? "Checking access..."
                      : isSubscribing
                        ? "Opening checkout..."
                        : user
                          ? "Subscribe now"
                          : "Sign in to subscribe"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16">
            <h2 className="mb-6 text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Compare plans
            </h2>
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="bg-muted/50 px-5 py-4 text-left font-medium text-muted-foreground">
                      Feature
                    </th>
                    <th className="bg-sky-50 px-5 py-4 text-center font-medium text-sky-800">
                      Free
                    </th>
                    <th className="bg-violet-50 px-5 py-4 text-center font-medium text-violet-800">
                      Unlimited
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="border-b border-border last:border-0">
                      <td className="px-5 py-4 text-muted-foreground">{row.feature}</td>
                      <td className="px-5 py-4 text-center">
                        <ComparisonCell value={row.free} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <ComparisonCell value={row.unlimited} highlight />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <PricingFaq />
        </div>
      </div>
    </MarketingLayout>
  )
}

function formatRazorpayCheckoutFailure(response: RazorpayPaymentFailedResponse) {
  const description = response.error?.description?.trim()
  if (description && /website does not match registered website/i.test(description)) {
    return "Razorpay blocked this payment because this website is not registered in Razorpay. Add the current live domain in Razorpay Dashboard, or use test keys for local development."
  }
  return description || "Razorpay payment failed. Please try again."
}

function Feature({ children, highlight = false }: { children: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <Check
        className={cn(
          "mt-0.5 h-4 w-4 flex-none",
          highlight ? "text-violet-600" : "text-sky-600"
        )}
      />
      <span>{children}</span>
    </div>
  )
}

function ComparisonCell({
  value,
  highlight = false,
}: {
  value: boolean | string
  highlight?: boolean
}) {
  if (typeof value === "string") {
    return (
      <span className={cn("font-mono font-medium", highlight && "text-foreground")}>
        {value}
      </span>
    )
  }
  return value ? (
    <Check className={cn("mx-auto h-4 w-4", highlight ? "text-violet-600" : "text-sky-600")} />
  ) : (
    <span className="text-muted-foreground">—</span>
  )
}
