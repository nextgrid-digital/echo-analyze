import { Link } from "react-router-dom"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center bg-gradient-to-br from-emerald-500 to-sky-600 text-[10px] font-bold text-white">
                E
              </span>
              <span className="text-sm font-semibold tracking-tight">ECHO</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Turn your mutual fund CAS statement into a professional portfolio
              analytics dashboard in minutes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:gap-12">
            <div>
              <p className="text-label text-muted-foreground">Product</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link to="/upload" className="text-foreground/80 hover:text-foreground">
                    Analyze CAS
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-foreground/80 hover:text-foreground">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-label text-muted-foreground">Includes</p>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li>Performance & XIRR</li>
                <li>Asset allocation</li>
                <li>Fund overlap</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          Portfolio analysis for informational purposes. Not investment advice.
        </div>
      </div>
    </footer>
  )
}
