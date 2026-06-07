import type { ReactNode } from "react"
import type { DashboardAccent } from "@/lib/dashboardTheme"
import { DASHBOARD_ACCENT_STYLES } from "@/lib/dashboardTheme"
import { cn } from "@/lib/utils"

interface NarrowCardProps {
  children: ReactNode
  className?: string
  accent?: DashboardAccent
}

export function NarrowCard({ children, className, accent }: NarrowCardProps) {
  const accentStyles = accent ? DASHBOARD_ACCENT_STYLES[accent] : null

  return (
    <div
      className={cn(
        "dashboard-content-card relative overflow-hidden rounded-2xl border border-white/70 p-4 shadow-md backdrop-blur-sm transition-all duration-300 hover:shadow-lg dark:border-white/10 sm:p-5",
        accentStyles
          ? cn(
              "bg-gradient-to-br dark:from-slate-900/90 dark:via-slate-900/75 dark:to-slate-800/60 dark:shadow-black/30",
              accentStyles.cardGradient,
              accentStyles.cardShadow
            )
          : "border-slate-200/80 bg-white/95 dark:border-slate-700 dark:bg-slate-900/90",
        className
      )}
    >
      {accentStyles && (
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r opacity-80",
            accentStyles.topGradient
          )}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  )
}
