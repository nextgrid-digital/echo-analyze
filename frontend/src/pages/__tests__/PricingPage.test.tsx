import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { PricingPage } from "../PricingPage"
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
})
