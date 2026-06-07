import type { ReactNode } from "react"
import type { DashboardAccent } from "@/lib/dashboardTheme"
import { DASHBOARD_ACCENT_STYLES } from "@/lib/dashboardTheme"
import { cn } from "@/lib/utils"

interface CompactCardProps {
  children: ReactNode
  className?: string
  accent?: DashboardAccent
}

export function CompactCard({ children, className, accent }: CompactCardProps) {
  const accentStyles = accent ? DASHBOARD_ACCENT_STYLES[accent] : null

  return (
    <div
      className={cn(
        "dashboard-kpi-card group relative overflow-hidden rounded-2xl border border-white/80 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-5",
        accentStyles
          ? cn(
              "bg-gradient-to-br shadow-lg",
              accentStyles.cardGradient,
              accentStyles.cardShadow
            )
          : "dashboard-card border-slate-200/80 bg-white shadow-sm",
        className
      )}
    >
      {accentStyles && (
        <>
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
              accentStyles.topGradient
            )}
          />
          <div
            className={cn(
              "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl",
              accentStyles.sectionGlow
            )}
          />
        </>
      )}
      <div className="relative">{children}</div>
    </div>
  )
}
