const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js"
const RAZORPAY_SCRIPT_ID = "razorpay-checkout-script"

export interface RazorpayPrefill {
  name?: string
  email?: string
  contact?: string
}

export interface RazorpayCheckoutSuccess {
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_subscription_id?: string
  razorpay_signature: string
}

export interface RazorpayCheckoutOptions {
  key: string
  name: string
  description?: string
  orderId?: string
  subscriptionId?: string
  amount?: number
  currency?: string
  prefill?: RazorpayPrefill
  notes?: Record<string, string>
  themeColor?: string
  onSuccess: (result: RazorpayCheckoutSuccess) => void
  onDismiss?: () => void
  onFailure?: (error: { code?: string; description?: string; reason?: string }) => void
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (payload: unknown) => void) => void
  close: () => void
}

type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance

declare global {
  interface Window {
    Razorpay?: RazorpayCtor
  }
}

let scriptLoadingPromise: Promise<void> | null = null

export function isRazorpayLoaded(): boolean {
  return typeof window !== "undefined" && typeof window.Razorpay !== "undefined"
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay can only be loaded in the browser."))
  }
  if (isRazorpayLoaded()) {
    return Promise.resolve()
  }
  if (scriptLoadingPromise) {
    return scriptLoadingPromise
  }

  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null
    const target = existing ?? document.createElement("script")
    if (!existing) {
      target.id = RAZORPAY_SCRIPT_ID
      target.src = RAZORPAY_SCRIPT_URL
      target.async = true
      document.head.appendChild(target)
    }
    target.addEventListener(
      "load",
      () => {
        if (isRazorpayLoaded()) {
          resolve()
        } else {
          reject(new Error("Razorpay script loaded but global is missing."))
        }
      },
      { once: true }
    )
    target.addEventListener(
      "error",
      () => {
        scriptLoadingPromise = null
        reject(new Error("Failed to load Razorpay checkout script."))
      },
      { once: true }
    )
  })

  return scriptLoadingPromise
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  await loadRazorpayScript()
  const Razorpay = window.Razorpay
  if (!Razorpay) {
    throw new Error("Razorpay SDK is unavailable.")
  }

  if (!options.orderId && !options.subscriptionId) {
    throw new Error("Either orderId or subscriptionId must be provided.")
  }

  const baseOptions: Record<string, unknown> = {
    key: options.key,
    name: options.name,
    description: options.description,
    currency: options.currency,
    prefill: options.prefill ?? {},
    notes: options.notes ?? {},
    theme: { color: options.themeColor ?? "#0F172A" },
    modal: {
      ondismiss: () => {
        options.onDismiss?.()
      },
    },
    handler: (response: Record<string, string>) => {
      options.onSuccess({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_subscription_id: response.razorpay_subscription_id,
        razorpay_signature: response.razorpay_signature,
      })
    },
  }

  if (options.subscriptionId) {
    baseOptions.subscription_id = options.subscriptionId
  } else if (options.orderId) {
    baseOptions.order_id = options.orderId
    if (typeof options.amount === "number") {
      baseOptions.amount = options.amount
    }
  }

  const instance = new Razorpay(baseOptions)
  instance.on("payment.failed", (payload: unknown) => {
    const errorPayload =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: { code?: string; description?: string; reason?: string } }).error
        : undefined
    options.onFailure?.(errorPayload ?? {})
  })
  instance.open()
}
