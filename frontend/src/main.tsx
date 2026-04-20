import { ClerkProvider } from "@clerk/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, useNavigate } from "react-router-dom"
import App from "./App.tsx"
import "./index.css"

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function AuthSetupNotice() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-2xl border border-border bg-card p-8 sm:p-10">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-3">Authentication</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          Add your publishable key
        </h1>
        <p className="text-muted-foreground leading-7">
          Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in your frontend environment, then reload
          the app. Sign-in must be configured before protected features can load.
        </p>
      </div>
    </div>
  )
}

function RootLayout() {
  const navigate = useNavigate()

  if (!PUBLISHABLE_KEY) {
    return <AuthSetupNotice />
  }

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      <App />
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RootLayout />
    </BrowserRouter>
  </StrictMode>,
)
