import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { PricingPage } from "../PricingPage"
import { createSubscription } from "@/api/billing"
import { useAuth } from "@/auth/useAuth"
import { RAZORPAY_CHECKOUT_SCRIPT, loadRazorpayCheckout } from "@/lib/razorpayCheckout"

vi.mock("@/api/billing", () => ({
  createSubscription: vi.fn(),
  verifySubscriptionPayment: vi.fn(),
}))

vi.mock("@/components/AdminAccessToolbar", () => ({
  AdminAccessToolbar: () => <div data-testid="admin-access-toolbar">Admin</div>,
}))

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}))

describe("PricingPage", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
    delete (window as Window & { Razorpay?: unknown }).Razorpay
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    document.querySelectorAll(`script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`).forEach((script) => script.remove())
    delete (window as Window & { Razorpay?: unknown }).Razorpay
  })

  it("keeps checkout disabled while billing access is still loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      configured: true,
      loading: false,
      session: null,
      user: { id: "user_test", email: "user@example.com" } as ReturnType<typeof useAuth>["user"],
      username: "test-user",
      isAdmin: false,
      billingAccess: null,
      refreshBillingAccess: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    })

    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("button", { name: /checking access/i })).toBeDisabled()
  })

  it("resolves when the Razorpay checkout script loads", async () => {
    const promise = loadRazorpayCheckout()
    const script = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`)

    expect(script).not.toBeNull()
    fireEvent.load(script!)

    await expect(promise).resolves.toBeUndefined()
    expect(script?.dataset.loadState).toBe("loaded")
  })

  it("replaces a previously failed Razorpay checkout script", async () => {
    const failedScript = document.createElement("script")
    failedScript.src = RAZORPAY_CHECKOUT_SCRIPT
    failedScript.dataset.loadState = "error"
    document.body.appendChild(failedScript)

    const promise = loadRazorpayCheckout()
    const scripts = document.querySelectorAll<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`)

    expect(scripts).toHaveLength(1)
    expect(scripts[0]).not.toBe(failedScript)
    fireEvent.load(scripts[0])

    await expect(promise).resolves.toBeUndefined()
  })

  it("removes a stalled Razorpay checkout script after timeout", async () => {
    vi.useFakeTimers()
    const promise = loadRazorpayCheckout()
    const script = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`)

    expect(script).not.toBeNull()
    vi.advanceTimersByTime(15_000)

    await expect(promise).rejects.toThrow(/timed out/i)
    expect(document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`)).toBeNull()
  })

  it("surfaces Razorpay registered-website blocks from checkout failures", async () => {
    const on = vi.fn()
    const open = vi.fn()
    const refreshBillingAccess = vi.fn()
    vi.mocked(useAuth).mockReturnValue({
      configured: true,
      loading: false,
      session: null,
      user: { id: "user_test", email: "user@example.com" } as ReturnType<typeof useAuth>["user"],
      username: "test-user",
      isAdmin: false,
      billingAccess: {
        can_analyze: true,
        has_unlimited_reports: false,
        cas_report_limit: 1,
        cas_reports_used: 1,
        remaining_free_reports: 0,
        subscription_status: "free",
        razorpay_subscription_id: null,
      },
      refreshBillingAccess,
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    })
    vi.mocked(createSubscription).mockResolvedValue({
      key_id: "rzp_live_test",
      subscription_id: "sub_test123",
      subscription_status: "created",
      access: {
        can_analyze: true,
        has_unlimited_reports: false,
        cas_report_limit: 1,
        cas_reports_used: 1,
        remaining_free_reports: 0,
        subscription_status: "created",
        razorpay_subscription_id: "sub_test123",
      },
    })
    type RazorpayFailureHandler = (response: { error?: { description?: string } }) => void
    window.Razorpay = vi.fn(function RazorpayMock() {
      return {
        open,
        on: (event: "payment.failed", handler: RazorpayFailureHandler) => {
          on(event, handler)
          handler({
            error: {
              description: "Payment blocked as website does not match registered website(s)",
            },
          })
        },
      }
    }) as unknown as NonNullable<Window["Razorpay"]>

    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }))

    await waitFor(() => {
      expect(screen.getByText(/website is not registered in razorpay/i)).toBeInTheDocument()
    })
    expect(on).toHaveBeenCalledWith("payment.failed", expect.any(Function))
    expect(open).toHaveBeenCalled()
    expect(refreshBillingAccess).not.toHaveBeenCalled()
  })
})
