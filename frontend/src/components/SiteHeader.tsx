import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { EchoLogo } from "@/components/EchoLogo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { to: "/pricing", label: "Pricing" },
  { to: "/demo", label: "Demo" },
] as const

const AUTH_NAV_LINKS = [{ to: "/dashboard", label: "Dashboard" }] as const

export function SiteHeader() {
  const { pathname } = useLocation()
  const { user, isAdmin, signOut, username } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          to="/"
          className="group flex items-center gap-2 text-foreground hover:opacity-80"
        >
          <EchoLogo size={32} className="shadow-sm" />
          <span className="text-lg font-bold tracking-tight">ECHO</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {NAV_LINKS.map(({ to, label }) => (
            <Button
              key={to}
              asChild
              variant="ghost"
              size="sm"
              className={cn(pathname === to && "bg-accent text-accent-foreground")}
            >
              <Link to={to}>{label}</Link>
            </Button>
          ))}
          {user ? (
            <>
              {AUTH_NAV_LINKS.map(({ to, label }) => (
                <Button
                  key={to}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(pathname === to && "bg-accent text-accent-foreground")}
                >
                  <Link to={to}>{label}</Link>
                </Button>
              ))}
              <span className="hidden text-sm text-muted-foreground sm:inline">{username}</span>
              {isAdmin && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="ml-1">
                <Link to="/demo">Book demo</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
