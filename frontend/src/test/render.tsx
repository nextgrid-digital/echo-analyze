import type { ReactElement, ReactNode } from "react"
import { render, type RenderOptions } from "@testing-library/react"
import { AuthContext, type AuthContextValue } from "@/auth/auth-context"
import { ActiveThemeProvider } from "@/components/themes/active-theme"
import { ThemeProvider } from "@/components/themes/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

const mockAuth: AuthContextValue = {
  configured: false,
  loading: false,
  session: null,
  user: null,
  username: "",
  isAdmin: false,
  billingAccess: null,
  billingAccessLoading: false,
  billingAccessError: null,
  refreshBillingAccess: async () => null,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signUp: async () => {},
  signOut: async () => {},
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ActiveThemeProvider>
        <AuthContext.Provider value={mockAuth}>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthContext.Provider>
      </ActiveThemeProvider>
    </ThemeProvider>
  )
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, {
    wrapper: Providers,
    ...options,
  })
}

export * from "@testing-library/react"
