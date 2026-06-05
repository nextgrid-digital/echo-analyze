import { useState } from "react"
import { Link } from "react-router-dom"
import { createSubscription, verifySubscriptionPayment } from "@/api/billing"
import { useAuth } from "@/auth/useAuth"
import { AdminAccessToolbar } from "@/components/AdminAccessToolbar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { loadRazorpayCheckout } from "@/lib/razorpayCheckout"
import { ArrowLeft, Check, CreditCard, Infinity as InfinityIcon, ScanLine } from "lucide-react"

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
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

export function PricingPage() {
  const { user, billingAccess, refreshBillingAccess } = useAuth()
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isUnlimited = billingAccess?.has_unlimited_reports === true
  const remainingReports = billingAccess?.remaining_free_reports ?? 0
  const canStartSubscription = Boolean(user && billingAccess && !isUnlimited)

  const handleSubscribe = async () => {
    setError(null)
    setSuccess(null)

    if (!user) {
      setError("Sign in before starting checkout.")
      return
    }
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
          description: "Unlimited CAS report analysis",
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
        checkout.open()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed. Please try again.")
    } finally {
      setIsSubscribing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
          <AdminAccessToolbar />
        </div>

        <header className="mb-10">
          <p className="text-sm font-medium text-muted-foreground">Subscription</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">Choose your CAS access</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Start with one free report, then unlock unlimited CAS analysis for your account.
          </p>
        </header>

        {(error || success) && (
          <Alert variant={error ? "destructive" : "default"} className="mb-6">
            <AlertDescription>{error ?? success}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="min-h-[420px]">
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center border border-border bg-muted">
                <ScanLine className="w-5 h-5" />
              </div>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>For trying the portfolio analyzer once.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-8">
              <div>
                <div className="text-4xl font-semibold">Rs 0</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {remainingReports > 0
                    ? `${remainingReports} free report remaining`
                    : "Free report already used"}
                </p>
                <div className="mt-8 space-y-4 text-sm">
                  <Feature>One CAS PDF or JSON analysis</Feature>
                  <Feature>Portfolio dashboard and export tools</Feature>
                  <Feature>No commitment required</Feature>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Use free report</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="min-h-[420px] border-foreground">
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center border border-foreground bg-foreground text-background">
                <InfinityIcon className="w-5 h-5" />
              </div>
              <CardTitle className="text-2xl">Unlimited</CardTitle>
              <CardDescription>For ongoing CAS scans on the same account.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-8">
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-semibold">Rs 2,360</span>
                  <span className="pb-1 text-sm text-muted-foreground">per billing cycle</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Rs 2,000 plus 18% GST, billed monthly.
                </p>
                <div className="mt-8 space-y-4 text-sm">
                  <Feature>Unlimited CAS report analysis</Feature>
                  <Feature>Available whenever you sign in</Feature>
                  <Feature>Easy renewal and cancellation</Feature>
                </div>
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={isSubscribing || !canStartSubscription}
                onClick={() => void handleSubscribe()}
              >
                <CreditCard className="w-4 h-4" />
                {isUnlimited
                  ? "Active"
                  : !billingAccess
                    ? "Checking access..."
                    : isSubscribing
                      ? "Opening checkout..."
                      : "Subscribe"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Feature({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-3">
      <Check className="mt-0.5 h-4 w-4 flex-none" />
      <span>{children}</span>
    </div>
  )
}
