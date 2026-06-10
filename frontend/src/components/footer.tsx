import { Link } from "react-router-dom"
import { EchoLogo } from "@/components/EchoLogo"

const navLinks = [
  { to: "/demo", label: "Book a demo" },
  { to: "/pricing", label: "Pricing" },
  { to: "/sign-in", label: "Sign in" },
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
] as const

export function MarketingFooter() {
  return (
    <footer className="mx-auto max-w-5xl border-t border-border *:px-4 *:md:px-6">
      <div className="flex flex-col gap-6 py-6">
        <div className="flex items-center">
          <Link className="flex items-center gap-2" to="/">
            <EchoLogo size={18} />
            <span className="text-sm font-semibold tracking-tight">ECHO</span>
          </Link>
        </div>

        <nav>
          <ul className="flex flex-wrap gap-4 text-sm font-medium text-muted-foreground md:gap-6">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link className="hover:text-foreground" to={link.to}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="flex flex-col gap-2 border-t py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p>&copy; {new Date().getFullYear()} ECHO</p>
        <p className="max-w-md text-xs sm:text-right sm:text-sm">
          Portfolio analysis for informational purposes. Not investment advice.
        </p>
      </div>
    </footer>
  )
}
