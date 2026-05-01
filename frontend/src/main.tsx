import { ClerkProvider } from "@clerk/react"
import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, useNavigate } from "react-router-dom"
import { AuthConfigContext, type AuthRuntimeConfig } from "@/lib/authConfig"
import App from "./App.tsx"
import "./index.css"

const CONFIG_REQUEST_TIMEOUT_MS = 5000

async function loadPublicConfig(): Promise<AuthRuntimeConfig> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), CONFIG_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch("/api/config", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      return {}
    }

    return (await response.json()) as AuthRuntimeConfig
  } catch {
    return {}
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function AuthLoadingNotice() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-2xl border border-border bg-card p-8 sm:p-10 text-muted-foreground">
        Loading authentication...
      </div>
    </div>
  )
}

export function AuthSetupNotice() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-2xl border border-border bg-card p-8 sm:p-10">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-3">Authentication</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          Add your publishable key
        </h1>
        <p className="text-muted-foreground leading-7">
          Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> or <code>CLERK_PUBLISHABLE_KEY</code> in
          the app environment, then reload the app. Sign-in must be configured before protected
          features can load.
        </p>
      </div>
    </div>
  )
}

function AuthDomainNotice({ config }: { config: AuthRuntimeConfig }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-2xl border border-border bg-card p-8 sm:p-10">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-3">Authentication</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          Clerk cannot load locally
        </h1>
        <p className="text-muted-foreground leading-7">
          The configured Clerk {config.clerk_key_type ?? "publishable"} key points to{" "}
          <code>{config.clerk_frontend_api ?? "an unknown frontend domain"}</code>, but that
          domain cannot be resolved from this machine. Use a Clerk test publishable key for
          localhost, or fix the DNS/CNAME for the production Clerk custom domain.
        </p>
      </div>
    </div>
  )
}

export function RootLayout() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<AuthRuntimeConfig | null>(null)
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function loadConfig() {
      const nextConfig = await loadPublicConfig()
      if (!isCancelled) {
        setConfig(nextConfig)
        setConfigLoaded(true)
      }
    }

    void loadConfig()

    return () => {
      isCancelled = true
    }
  }, [])

  if (!configLoaded) {
    return <AuthLoadingNotice />
  }

  const publishableKey = config?.clerk_publishable_key?.trim()

  if (!publishableKey) {
    return <AuthSetupNotice />
  }

  const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"

  if (isLocalHost && config?.clerk_frontend_api && config.clerk_frontend_api_resolves === false) {
    return <AuthDomainNotice config={config} />
  }

  return (
    <AuthConfigContext.Provider value={config}>
      <ClerkProvider
        publishableKey={publishableKey}
        afterSignOutUrl="/"
        routerPush={(to) => navigate(to)}
        routerReplace={(to) => navigate(to, { replace: true })}
      >
        <App />
      </ClerkProvider>
    </AuthConfigContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RootLayout />
    </BrowserRouter>
  </StrictMode>,
)
