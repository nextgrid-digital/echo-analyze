export const RAZORPAY_CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js"

const RAZORPAY_CHECKOUT_LOAD_TIMEOUT_MS = 15_000

function hasRazorpayCheckout() {
  return Boolean((window as Window & { Razorpay?: unknown }).Razorpay)
}

function waitForRazorpayScript(script: HTMLScriptElement) {
  return new Promise<void>((resolve, reject) => {
    let timeoutId: number | null = null

    function cleanup() {
      script.removeEventListener("load", onLoad)
      script.removeEventListener("error", onError)
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }

    function onLoad() {
      cleanup()
      script.dataset.loadState = "loaded"
      resolve()
    }

    function onError() {
      cleanup()
      script.dataset.loadState = "error"
      script.remove()
      reject(new Error("Checkout failed to load. Please try again."))
    }

    script.addEventListener("load", onLoad, { once: true })
    script.addEventListener("error", onError, { once: true })
    timeoutId = window.setTimeout(() => {
      script.dataset.loadState = "error"
      script.remove()
      cleanup()
      reject(new Error("Checkout timed out. Please try again."))
    }, RAZORPAY_CHECKOUT_LOAD_TIMEOUT_MS)
  })
}

export function loadRazorpayCheckout() {
  if (hasRazorpayCheckout()) {
    return Promise.resolve()
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`
  )
  if (existingScript) {
    if (existingScript.dataset.loadState === "error" || existingScript.dataset.loadState === "loaded") {
      existingScript.remove()
    } else {
      return waitForRazorpayScript(existingScript)
    }
  }

  const script = document.createElement("script")
  script.src = RAZORPAY_CHECKOUT_SCRIPT
  script.async = true
  script.dataset.loadState = "loading"
  document.body.appendChild(script)
  return waitForRazorpayScript(script)
}
