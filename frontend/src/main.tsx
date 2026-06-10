import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "@/auth/AuthContext"
import { ActiveThemeProvider } from "@/components/themes/active-theme"
import { ThemeProvider } from "@/components/themes/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DEFAULT_THEME } from "@/components/themes/theme.config"
import KBar from "@/components/kbar"
import App from "./App.tsx"
import "./index.css"

if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", DEFAULT_THEME)
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ActiveThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider>
              <KBar>
                <App />
              </KBar>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </ActiveThemeProvider>
    </ThemeProvider>
  </StrictMode>,
)
