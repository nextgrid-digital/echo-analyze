import { SignInButton, useAuth } from "@clerk/react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AuthToolbar } from "@/components/auth/AuthToolbar"
import { RazorpayCheckoutButton } from "@/components/payments/RazorpayCheckoutButton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  fetchPaymentsConfig,
  type PaymentsConfig,
} from "@/api/payments"
import { ArrowLeft, ShieldCheck } from "lucide-react"

function formatPrice(amountPaise: number | null | undefined, currency: string): string {
  if (!amountPaise || amountPaise <= 0) return "\u2014"
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

export function BillingPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const [config, setConfig] = useState<PaymentsConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchPaymentsConfig()
      .then((data) => {
        if (!cancelled) {
          setConfig(data)
          setLoadError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Unable to load billing configuration.")
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const subscriptionPrice = config
    ? formatPrice(config.default_amount_paise, config.currency)
    : "—"

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" type="button">
            <Link to="/">
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Link>
          </Button>
          <AuthToolbar />
        </div>

        <header className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">Echo Billing</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Activate a monthly subscription or top up with a one-time payment. Powered by
            Razorpay; your card details never reach our servers.
          </p>
        </header>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading billing details…
            </CardContent>
          </Card>
        ) : loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : !config?.enabled ? (
          <Alert>
            <AlertDescription>
              Payments are not configured yet. Set <code>RAZORPAY_KEY_ID</code> and{" "}
              <code>RAZORPAY_KEY_SECRET</code> in the deployment environment and reload this
              page.
            </AlertDescription>
          </Alert>
        ) : !isLoaded ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Verifying your session…
            </CardContent>
          </Card>
        ) : !isSignedIn ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in to subscribe</CardTitle>
              <CardDescription>
                Subscriptions are linked to your Echo account so we can keep your access
                in sync across devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton mode="modal">
                <Button type="button">Sign in to continue</Button>
              </SignInButton>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly subscription</CardTitle>
                <CardDescription>
                  {config.description ?? "Recurring access to Echo Analyze."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-semibold">
                    {subscriptionPrice}
                    <span className="text-sm font-normal text-muted-foreground"> / {config.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Billed automatically every {config.interval > 1 ? `${config.interval} ${config.period}s` : config.period}.
                    Cancel anytime from the Razorpay dashboard.
                  </p>
                </div>
                <RazorpayCheckoutButton
                  config={config}
                  mode="subscription"
                  label="Subscribe monthly"
                />
                {!config.plan_id ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <code>RAZORPAY_PLAN_ID</code> is not set, so subscriptions cannot be
                      created. Create a monthly plan in the Razorpay dashboard and copy its
                      <code> plan_id </code> into the env vars.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>One-time payment</CardTitle>
                <CardDescription>
                  Single charge — useful for trial top-ups or one-off purchases.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-semibold">
                    {formatPrice(config.default_amount_paise, config.currency)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    No automatic renewal.
                  </p>
                </div>
                <RazorpayCheckoutButton
                  config={config}
                  mode="order"
                  label="Pay once"
                />
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <ShieldCheck className="size-4" aria-hidden />
          <span>
            Razorpay handles all card and UPI data. Echo only stores the order, subscription,
            and payment IDs returned by Razorpay.
          </span>
        </div>
      </div>
    </div>
  )
}
