import type { ReactNode } from "react"
import type { DashboardAccent } from "@/lib/dashboardTheme"
import { DASHBOARD_ACCENT_STYLES } from "@/lib/dashboardTheme"
import { cn } from "@/lib/utils"

interface CompactCardProps {
  children: ReactNode
  className?: string
  accent?: DashboardAccent
  variant?: "default" | "hero"
}

export function CompactCard({
  children,
  className,
  accent,
  variant = "default",
}: CompactCardProps) {
  const accentStyles = accent ? DASHBOARD_ACCENT_STYLES[accent] : null
  const isHero = variant === "hero"

  return (
    <div
      className={cn(
        "dashboard-kpi-card group relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
        isHero
          ? "border-white/10 bg-gradient-to-br from-slate-900 via-teal-950 to-blue-950 p-6 shadow-2xl shadow-teal-900/30 sm:p-8"
          : cn(
              "border-white/80 p-4 sm:p-5 dark:border-white/10",
              accentStyles
                ? cn(
                    "bg-gradient-to-br shadow-lg dark:from-slate-900/90 dark:via-slate-900/75 dark:to-slate-800/60",
                    accentStyles.cardGradient,
                    accentStyles.cardShadow,
                    "dark:shadow-black/30"
                  )
                : "dashboard-card border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/90"
            ),
        className
      )}
    >
      {isHero ? (
        <>
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500" />
        </>
      ) : (
        accentStyles && (
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
        )
      )}
      <div className="relative">{children}</div>
    </div>
  )
}
